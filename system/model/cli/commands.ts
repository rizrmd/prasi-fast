import { execSync } from "child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { basename, join } from "path";
import { generateModelFile, updateModelsRegistry } from "./generators";
import { createModel } from "./createModel"; // Import createModel
import { capitalize } from "./utils";

export async function suggestModels() {
  // Get models from schema.prisma
  const schemaFile = "backend/prisma/schema.prisma";
  const schema = readFileSync(schemaFile, "utf-8");

  // Parse defined models and their table mappings
  const modelSections = schema.split(/\n\s*model\s+/).slice(1);
  const definedModels = modelSections.map((section) => {
    const modelName = section.match(/^(\w+)/)?.[1] || "";
    const tableMap = section.match(/@@map\("([^"]+)"\)/)?.[1];
    return { modelName, tableMap };
  });

  // Extract referenced model types from relations
  const relationTypes = new Set<string>();
  schema.split("\n").forEach((line) => {
    // Match type references in relations
    const matches = line.match(/\s+(\w+)(\??)\s+@relation/);
    if (matches) {
      relationTypes.add(matches[1]);
    }
  });

  // Combine defined and referenced models
  const allModels = [
    ...definedModels,
    ...[...relationTypes].map((name) => ({
      modelName: name,
      tableMap: `m_${name.toLowerCase()}`,
    })),
  ];

  // Get existing model files
  const files = existsSync(MODELS_DIR)
    ? execSync(`ls ${MODELS_DIR}`, { encoding: "utf-8" })
        .split("\n")
        .filter((f) => f.endsWith(".ts"))
    : [];
  const existingModels = files.map((f) => basename(f, ".ts"));

  // Find models that don't have corresponding files and aren't system tables
  const missingModels = allModels
    .filter(
      (model) =>
        !existingModels.includes(model.modelName.toLowerCase()) && // No model file exists
        (!model.tableMap || !model.tableMap.startsWith("s_")) // Not a system table
    )
    .map((m) => m.modelName);

  if (missingModels.length === 0) {
    console.log(
      "All tables in schema.prisma already have corresponding models."
    );
  } else {
    console.log("\nAvailable tables without models:");
    missingModels.forEach((modelName) => {
      const model = allModels.find((m) => m.modelName === modelName);
      if (model) {
        console.log(`- ${model.tableMap || modelName.toLowerCase()}`);
      }
    });
    console.log(
      '\nRun "bun model add <tablename>" with one of these names to create the model.'
    );
  }
}

const MODELS_DIR = "shared/models";
const MODELS_FILE = "shared/models.ts";

export function listModels() {
  const files = existsSync(MODELS_DIR)
    ? execSync(`ls ${MODELS_DIR}`, { encoding: "utf-8" })
        .split("\n")
        .filter((f) => f.endsWith(".ts"))
    : [];

  // Find the longest model name for padding
  const maxLength = Math.max(
    ...files.map((file) => capitalize(basename(file, ".ts")).length)
  );

  console.log("\nAvailable models:");
  files.forEach((file) => {
    const modelName = capitalize(basename(file, ".ts"));
    const tableName = `m_${modelName.toLowerCase()}`;
    console.log(`${modelName.padEnd(maxLength)} → ${tableName}`);
  });
}

export function removeModel(tableName: string) {
  if (!tableName) {
    console.error("Table name is required");
    process.exit(1);
  }

  const schemaFile = "backend/prisma/schema.prisma";
  const schema = readFileSync(schemaFile, "utf-8");

  // Verify table name exists
  const normalizedTableName = tableName.toLowerCase();
  // More robust pattern to handle whitespace and find all @@map declarations
  const mapPattern = /@@map\s*\(\s*"([^"]+)"\s*\)/g;
  const tables = [];
  let match;
  while ((match = mapPattern.exec(schema)) !== null) {
    tables.push(match[1]);
  }
  if (!tables.includes(normalizedTableName)) {
    // Check if the model is referenced in relations
    // Check both model name patterns (with and without m_ prefix)
    const baseModelName = tableName.replace("m_", "");
    const referencedAsModel = new RegExp(
      `\\s+\\w+\\s+(${baseModelName}|${tableName})[?\\[\\]]*\\s*(@relation|$)`
    );
    if (schema.match(referencedAsModel)) {
      console.error(
        `Table "${tableName}" not found, but model "${baseModelName}" is still referenced.`
      );
      console.error("Please remove these relations first:");

      // Find and show all references
      const lines = schema.split("\n");
      lines.forEach((line, index) => {
        if (line.match(referencedAsModel)) {
          const modelHeader = lines
            .slice(0, index)
            .reverse()
            .find((l) => l.trim().startsWith("model "));
          if (modelHeader) {
            const modelName = modelHeader.trim().split(/\s+/)[1];
            console.error(`  - ${modelName}: ${line.trim()}`);
          }
        }
      });
    } else {
      console.error(`Table "${tableName}" not found in schema.prisma`);
      console.error(`Available tables: ${tables.join(", ")}`);
    }
    return;
  }

  // Get model name from schema
  const modelMatch = schema.match(
    new RegExp(`model (\\w+) {[^}]*@@map\\("${normalizedTableName}"\\)`)
  );
  if (!modelMatch) {
    console.error(`Could not find model for table "${tableName}"`);
    return;
  }

  const modelName = modelMatch[1];
  const modelFile = join(MODELS_DIR, `${modelName.toLowerCase()}.ts`);

  try {
    // Remove model file
    if (existsSync(modelFile)) {
      unlinkSync(modelFile);
      console.log(`Removed model file: ${modelFile}`);
    }

    // Update models registry
    const content = readFileSync(MODELS_FILE, "utf-8");
    const updatedContent = content
      .replace(
        new RegExp(
          `import { ${capitalize(
            modelName
          )} } from "./models/${modelName.toLowerCase()}";\n`
        ),
        ""
      )
      .replace(
        new RegExp(
          `export const ${modelName.toLowerCase()}: ${capitalize(
            modelName
          )} = ModelRegistry.getInstance\\("${capitalize(
            modelName
          )}", ${capitalize(modelName)}\\);\n`
        ),
        ""
      );

    writeFileSync(MODELS_FILE, updatedContent);
    console.log(`Updated models registry`);

    // Find and remove references to this model in other models
    const relations =
      schema.match(
        new RegExp(`\\s+\\w+\\s+${modelName}[?\\[\\]]*\\s+@relation`, "g")
      ) || [];
    if (relations.length > 0) {
      console.error(
        `Cannot remove model: Found ${relations.length} relation(s) referencing this model:`
      );
      relations.forEach((relation) => {
        console.error(`  ${relation.trim()}`);
      });
      return;
    }

    // Update schema.prisma
    const modelPattern = new RegExp(
      `\\s*model ${modelName} {[^}]*?\\n}(\\n|$)`,
      "g"
    );
    const updatedSchema = schema.replace(modelPattern, "\n");
    writeFileSync(schemaFile, updatedSchema);
    console.log(`Updated schema.prisma`);

    // Format schema
    execSync("bun prisma format", { stdio: "inherit" });

    console.log(`Successfully removed model for table: ${tableName}`);
  } catch (error) {
    console.error("Error removing model:", error);
    process.exit(1);
  }
}

export function repairModels() {
  try {
    const files = existsSync(MODELS_DIR)
      ? execSync(`ls ${MODELS_DIR}`, { encoding: "utf-8" })
          .split("\n")
          .filter((f) => f.endsWith(".ts"))
      : [];

    // Get all model names
    const modelNames = files.map((f) => basename(f, ".ts"));

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
      imports += `import { ${capitalize(name)} } from "./models/${name}";\n`;
      exports += `export const ${name}: ${capitalize(
        name
      )} = ModelRegistry.getInstance("${capitalize(name)}", ${capitalize(
        name
      )});\n`;
    });

    // Update content
    content = content
      .replace("import { ModelRegistry }", `${imports}import { ModelRegistry }`)
      .replace("export const", `${exports}export const`);

    writeFileSync(MODELS_FILE, content);
    console.log("Successfully repaired models registry");
  } catch (error) {
    console.error("Error repairing models:", error);
    process.exit(1);
  }
}
