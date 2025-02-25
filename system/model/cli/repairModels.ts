import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { basename } from "path";
import { capitalize } from "./utils";

export const MODELS_DIR = "shared/models";
export const MODELS_FILE = "shared/models.ts";
export const PRISMA_SCHEMA = "backend/prisma/schema.prisma";

interface SystemTableField {
  name: string;
  type: string;
  modifier: string;
  relation?: {
    references: string;
    on: string;
  };
}

interface SystemTableInfo {
  tableName: string;
  fields: SystemTableField[];
}

interface ModelAccumulator {
  currentModel: string | null;
  systemTables: Record<string, SystemTableInfo>;
}

async function checkSystemTables() {
  const schemaContent = readFileSync(PRISMA_SCHEMA, 'utf-8');
  const models = schemaContent.split('\n').reduce<ModelAccumulator>((acc, line) => {
    const modelMatch = line.match(/^model\s+(\w+)\s+{/);
    const mapMatch = line.match(/@@map\("([^"]+)"\)/);
    
    if (modelMatch) {
      acc.currentModel = modelMatch[1];
    } else if (mapMatch && acc.currentModel) {
      if (mapMatch[1].startsWith('s_')) {
        acc.systemTables[acc.currentModel] = {
          tableName: mapMatch[1],
          fields: []
        };
      }
    } else if (acc.currentModel && acc.systemTables[acc.currentModel]) {
      // Capture field definitions
      const fieldMatch = line.match(/^\s+(\w+)\s+(\w+)(\??\s*@[^)]+\))?/);
      if (fieldMatch) {
        const field: SystemTableField = {
          name: fieldMatch[1],
          type: fieldMatch[2],
          modifier: fieldMatch[3] || ''
        };

        // Check for relations using @relation
        const relationMatch = field.modifier.match(/@relation\(fields: \[([^\]]+)\], references: \[([^\]]+)\]\)/);
        if (relationMatch) {
          field.relation = {
            references: relationMatch[2],
            on: relationMatch[1]
          };
        }
        
        acc.systemTables[acc.currentModel].fields.push(field);
      }
    }
    
    return acc;
  }, { currentModel: null, systemTables: {} });

  try {
    // Generate temporary Prisma schema for database introspection
    const tempSchema = `
      generator client {
        provider = "prisma-client-js"
      }
      
      datasource db {
        provider = "postgres"
        url      = env("DATABASE_URL")
      }
    `;
    writeFileSync('backend/prisma/temp.prisma', tempSchema);
    
    // Introspect database
    execSync('cd backend && npx prisma db pull --schema=prisma/temp.prisma', { stdio: 'inherit' });
    
    // Read introspected schema
    const dbSchema = readFileSync('backend/prisma/temp.prisma', 'utf-8');
    
    // Compare schema definitions
    for (const [modelName, info] of Object.entries(models.systemTables)) {
      const tableMatch = dbSchema.match(new RegExp(`model\\s+\\w+\\s+{[^}]*@@map\\("${info.tableName}"\\)`, 's'));
      
      if (!tableMatch) {
        console.log(`System table ${info.tableName} not found in database. Running migration...`);
        // Generate migration for this table
        const migration = generateSystemTableMigration(modelName, info);
        execSync(migration, { stdio: 'inherit' });
      }
    }
    
    // Cleanup
    execSync('rm backend/prisma/temp.prisma');
    
  } catch (error) {
    console.error('Error checking system tables:', error);
    process.exit(1);
  }
}

function mapPrismaTypeToSQL(type: string): string {
  switch (type.toLowerCase()) {
    case 'string':
      return 'TEXT';
    case 'int':
      return 'INTEGER';
    case 'float':
    case 'decimal':
      return 'DECIMAL';
    case 'datetime':
      return 'TIMESTAMP';
    case 'boolean':
      return 'BOOLEAN';
    case 'json':
      return 'JSONB';
    case 'uuid':
      return 'UUID';
    default:
      return 'TEXT';
  }
}

interface PrismaModifier {
  required: boolean;
  default?: string;
}

function parseModifier(modifier: string): PrismaModifier {
  const result: PrismaModifier = { required: !modifier.includes('?') };
  
  if (modifier.includes('@default')) {
    const defaultMatch = modifier.match(/@default\(([^)]+)\)/);
    if (defaultMatch) {
      result.default = defaultMatch[1];
    }
  }
  
  return result;
}

function generateSystemTableMigration(modelName: string, info: SystemTableInfo): string {
  const fields = info.fields
    .map((f: SystemTableField) => {
      const sqlType = mapPrismaTypeToSQL(f.type);
      const { required, default: defaultValue } = parseModifier(f.modifier);
      
      let fieldDef = `"${f.name}" ${sqlType}`;
      
      if (!required) {
        fieldDef += ' NULL';
      } else {
        fieldDef += ' NOT NULL';
      }
      
      if (defaultValue) {
        if (defaultValue.startsWith('uuid')) {
          fieldDef += ' DEFAULT gen_random_uuid()';
        } else if (defaultValue === 'now()') {
          fieldDef += ' DEFAULT CURRENT_TIMESTAMP';
        } else if (defaultValue === 'auto()') {
          // For auto-incrementing IDs
          if (sqlType === 'INTEGER') {
            fieldDef = `"${f.name}" SERIAL`;
          }
        } else {
          fieldDef += ` DEFAULT ${defaultValue}`;
        }
      }
      
      return fieldDef;
    })
    .join(',\n    ');
    
  // Add foreign key constraints
  const foreignKeys = info.fields
    .filter(f => f.relation)
    .map(f => `ALTER TABLE "${info.tableName}" 
      ADD CONSTRAINT "fk_${info.tableName}_${f.name}" 
      FOREIGN KEY ("${f.relation!.on}") 
      REFERENCES "${f.relation!.references}" 
      ON DELETE CASCADE;`)
    .join('\n');
    
  // Add extension for UUID support if needed
  const needsUUID = info.fields.some(f => f.type.toLowerCase() === 'uuid');
  const createExtension = needsUUID ? 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n' : '';
  
  const sql = `
    ${createExtension}
    CREATE TABLE IF NOT EXISTS "${info.tableName}" (
      ${fields}
    );
    ${foreignKeys}
  `;
  
  return `echo '${sql.replace(/'/g, "'\\''")}' | psql $DATABASE_URL`;
}

export async function repairModels() {
  try {
    // First check and repair system tables
    await checkSystemTables();
    
    const dirs = existsSync(MODELS_DIR)
      ? execSync(`ls -d ${MODELS_DIR}/*/`, { encoding: "utf-8" })
          .split("\n")
          .filter(Boolean)
          .map((dir) => dir.slice(0, -1)) // Remove trailing slash
          .map((dir) => basename(dir))
      : [];

    // Get all model names
    const modelNames = dirs;

    // Read current models registry
    let content = readFileSync(MODELS_FILE, "utf-8");

    // Clear existing model imports and exports
    content = content
      .replace(/import { .* } from "\.\/models\/.*";\n/g, "")
      .replace(
        /export const .*: .* = ModelRegistry\.getInstance\(".*", .*\);\n/g,
        ""
      );

    // Add all models
    let imports = "";
    let exports = "";

    modelNames.forEach((name) => {
      imports += `import { ${capitalize(
        name
      )} } from "./models/${name}/model";\n`;
      exports += `export const ${name}: ${capitalize(
        name
      )} = ModelRegistry.getInstance("${capitalize(name)}", ${capitalize(
        name
      )});\n`;
    });

    // Update content
    content =
      content
        .replace(
          "import { ModelRegistry }",
          `${imports}import { ModelRegistry }`
        )
        .replace("export const", `${exports}export const`) + exports;

    writeFileSync(MODELS_FILE, content);
    console.log("Successfully repaired models registry");
  } catch (error) {
    console.error("Error repairing models:", error);
    process.exit(1);
  }
}
