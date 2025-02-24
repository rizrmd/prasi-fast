import { Attribute, getSchema, Model, Property } from "@mrleebo/prisma-ast";
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { basename } from "path";
import { capitalize } from "./utils";

const MODELS_DIR = "shared/models";
const MODELS_FILE = "shared/models.ts";

export async function suggestModels() {
  // Parse schema using prisma-ast
  const schemaFile = "backend/prisma/schema.prisma";
  const schema = readFileSync(schemaFile, "utf-8");
  const parsedSchema = getSchema(schema);

  // Get defined models and their table mappings
  const models = parsedSchema.list.filter(item => item.type === "model") as (Model & { properties: Property[]; attributes?: Attribute[] })[];
  const definedModels = models.map(model => ({
    modelName: model.name,
    tableMap: model.attributes?.find(attr => 
      attr.type === "attribute" && 
      attr.name === "map"
    )?.args?.[0]?.value
  }));

  // Extract referenced model types from relations
  const relationTypes = new Set<string>();
  models.forEach(model => {
    model.properties.forEach(prop => {
      if (prop.type === "field" && "fieldType" in prop) {
        const fieldProp = prop as { fieldType: string; attributes?: Attribute[] };
        if (fieldProp.attributes?.some(attr => attr.type === "attribute" && attr.name === "relation")) {
          relationTypes.add(fieldProp.fieldType);
        }
      }
    });
  });

  // Combine defined and referenced models
  const allModels = [
    ...definedModels,
    ...[...relationTypes].map(name => ({
      modelName: name,
      tableMap: `m_${name.toLowerCase()}`,
    })),
  ];

  // Get existing model files
  const dirs = existsSync(MODELS_DIR)
    ? execSync(`ls -d ${MODELS_DIR}/*/`, { encoding: "utf-8" })
        .split("\n")
        .filter(Boolean)
        .map(dir => dir.slice(0, -1))  // Remove trailing slash
        .map(dir => basename(dir))
    : [];
  const existingModels = dirs;

  // Find models that don't have corresponding files and aren't system tables
  const missingModels = allModels
    .filter(
      (model) =>
        !existingModels.includes(model.modelName.toLowerCase()) && // No model file exists
        (!model.tableMap || (typeof model.tableMap === 'string' && !model.tableMap.startsWith("s_"))) // Not a system table
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

export function listModels() {
  const dirs = existsSync(MODELS_DIR)
    ? execSync(`ls -d ${MODELS_DIR}/*/`, { encoding: "utf-8" })
        .split("\n")
        .filter(Boolean)
        .map(dir => dir.slice(0, -1))  // Remove trailing slash
        .map(dir => basename(dir))
    : [];

  // Find the longest model name for padding
  const maxLength = Math.max(
    ...dirs.map((dir) => capitalize(dir).length)
  );

  console.log("\nAvailable models:");
  dirs.forEach((dir) => {
    const modelName = capitalize(dir);
    const tableName = `m_${modelName.toLowerCase()}`;
    console.log(`${modelName.padEnd(maxLength)} → ${tableName}`);
  });
}

export function repairModels() {
  try {
    const dirs = existsSync(MODELS_DIR)
      ? execSync(`ls -d ${MODELS_DIR}/*/`, { encoding: "utf-8" })
          .split("\n")
          .filter(Boolean)
          .map(dir => dir.slice(0, -1))  // Remove trailing slash
          .map(dir => basename(dir))
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
      imports += `import { ${capitalize(name)} } from "./models/${name}/model";\n`;
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
