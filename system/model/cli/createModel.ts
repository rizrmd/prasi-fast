import { execSync } from "child_process";
import { readFileSync, unlinkSync, writeFileSync } from "fs";
import { suggestModels } from "./commands"; // Import suggestModels
import {
  addModelToPrisma,
  generateModelFile,
  updateModelsRegistry,
} from "./generators";
import { capitalize } from "./utils";
import { getSchema, Model } from "@mrleebo/prisma-ast";

export async function createModel(tableName: string) {
  if (!tableName) {
    await suggestModels();
    return;
  }

  const schemaFile = "backend/prisma/schema.prisma";
  const tempSchemaFile = "backend/prisma/temp-schema.prisma";

  try {
    // Create a temporary schema file
    const baseSchema = readFileSync(schemaFile, "utf-8");
    const parsedBaseSchema = getSchema(baseSchema);

    // Check if model already exists in current schema
    const existingModel = parsedBaseSchema.list.find(
      (item) =>
        item.type === "model" &&
        item.name.toLowerCase() === tableName.toLowerCase()
    );

    writeFileSync(tempSchemaFile, baseSchema);

    try {
      // Pull the database schema into the temporary file
      execSync(
        "cd backend && bun prisma db pull --schema=prisma/temp-schema.prisma",
        { stdio: "ignore" }
      );
    } catch (error) {
      console.error("Error pulling database schema:", error);
      return;
    }

    // Read the pulled schema with actual database structure
    const schema = readFileSync(tempSchemaFile, "utf-8");
    const parsedSchema = getSchema(schema);

    // Clean up temp file
    unlinkSync(tempSchemaFile);

    // Determine model name from table name
    const modelName =
      tableName.startsWith("m_") || tableName.startsWith("t_")
        ? capitalize(tableName.slice(2))
        : capitalize(tableName);

    // Find the model in parsed schema
    const model = parsedSchema.list.find(
      (item) =>
        item.type === "model" &&
        item.name.toLowerCase() === tableName.toLowerCase()
    ) as Model;

    if (!model) {
      console.error(`Model for table ${tableName} not found in schema`);
      return;
    }

    model.name = modelName;

    addModelToPrisma(model, tableName);

    execSync("cd backend && bun prisma format", { stdio: "ignore" });

    // Generate the model file
    generateModelFile(modelName, schema);
    // Update the models registry
    updateModelsRegistry(modelName);
  } catch (error) {
    console.error("Error creating model:", error);
    process.exit(1);
  }
}
