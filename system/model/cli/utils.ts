import { execSync } from "child_process";
import { readFileSync } from "fs";
import { getSchema } from "@mrleebo/prisma-ast";

// Helper to capitalize first letter
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Get database provider from schema
export const getDatabaseProvider = () => {
  const schemaContent = readFileSync("backend/prisma/schema.prisma", "utf-8");
  const schema = getSchema(schemaContent);
  const datasource = schema.list.find((item) => item.type === "datasource");
  if (!datasource) return "postgresql";

  // In the AST, datasource properties are in 'properties' array
  const properties = (datasource as any).properties || [];
  const provider = properties.find(
    (p: { name: string }) => p.name === "provider"
  );
  return (provider?.value as string)?.replace(/['"]/g, "") ?? "postgresql";
};

// Helper to execute SQL through Prisma
export const executePrismaSql = (sql: string) => {
  const escapedSql = sql.replace(/"/g, '\\"');
  try {
    execSync(`cd backend && bun prisma db execute --stdin`, {
      input: sql,
      stdio: ["pipe", "ignore", "pipe"],
    });
    return true;
  } catch (error) {
    console.error("Error executing SQL:", error);
    return false;
  }
};

// Generate SQL to add required columns based on provider
const generateColumnAdditionSql = (provider: string, tableName: string) => {
  if (provider === "postgresql") {
    return `
      ALTER TABLE "${tableName}"
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
      ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger 
          WHERE tgname = 'update_${tableName}_updated_at'
        ) THEN
          CREATE TRIGGER update_${tableName}_updated_at
          BEFORE UPDATE ON "${tableName}"
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `;
  } else if (provider === "sqlite") {
    // SQLite doesn't support IF NOT EXISTS for ALTER TABLE
    // We'll need to check if columns exist first
    return `
      BEGIN TRANSACTION;
      
      -- SQLite doesn't support checking if column exists in single statement
      -- so we'll add columns and ignore errors if they exist
      ALTER TABLE "${tableName}" ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "${tableName}" ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP; 
      ALTER TABLE "${tableName}" ADD COLUMN deleted_at DATETIME;
      ALTER TABLE "${tableName}" ADD COLUMN created_by TEXT;
      ALTER TABLE "${tableName}" ADD COLUMN updated_by TEXT;

      DROP TRIGGER IF EXISTS update_${tableName}_updated_at;
      CREATE TRIGGER update_${tableName}_updated_at
      AFTER UPDATE ON "${tableName}"
      BEGIN
        UPDATE "${tableName}" SET updated_at = DATETIME('now')
        WHERE id = NEW.id;
      END;
      
      COMMIT;
    `;
  }
  throw new Error(`Unsupported database provider: ${provider}`);
};

// Create trigger function for PostgreSQL if it doesn't exist
const createPostgresUpdatedAtFunction = () => {
  return `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `;
};

// Add required columns to table
export const ensureRequiredColumns = async (tableName: string) => {
  try {
    const provider = getDatabaseProvider();

    if (provider === "postgresql") {
      // First create the trigger function if it doesn't exist
      executePrismaSql(createPostgresUpdatedAtFunction());
    }

    const sql = generateColumnAdditionSql(provider, tableName);
    return executePrismaSql(sql);
  } catch (error) {
    console.error("Error ensuring required columns:", error);
    return false;
  }
};
