import { execSync } from "child_process";
import { readFileSync, unlinkSync, writeFileSync } from "fs";
import { suggestModels } from "../commands"; // Import suggestModels
import {
  addModelToPrisma,
  generateModelFile,
  updateModelsRegistry,
} from "./generators";
import { createLayout } from "./createLayout";
import { capitalize, ensureRequiredColumns } from "../utils";
import { getSchema, Model } from "@mrleebo/prisma-ast";

export async function createModel(tableName: string) {
  if (!tableName) {
    await suggestModels();
    return;
  }

  const schemaFile = "backend/prisma/schema.prisma";
  const tempSchemaFile = "backend/prisma/temp-schema.prisma";

  try {
    // Ensure required columns exist
    const columnsAdded = await ensureRequiredColumns(tableName);
    if (!columnsAdded) {
      console.error("Error adding required columns to table");
      return;
    }

    // Create a temporary schema file
    const baseSchema = readFileSync(schemaFile, "utf-8");
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
    const tempSchema = readFileSync(tempSchemaFile, "utf-8");
    const parsedSchema = getSchema(tempSchema);

    // Clean up temp file
    unlinkSync(tempSchemaFile);

    // Determine model name from table name
    const modelName =
      tableName.startsWith("m_") || tableName.startsWith("t_")
        ? capitalize(tableName.slice(2))
        : capitalize(tableName);

    let alreadyGenerated = false;

    // Find the model in parsed schema
    const model = parsedSchema.list.find((item) => {
      if (item.type === "model" && item.name === modelName) {
        alreadyGenerated = true;
      }
      return (
        item.type === "model" &&
        item.name.toLowerCase() === tableName.toLowerCase()
      );
    }) as Model;

    if (!model) {
      if (alreadyGenerated) {
        console.warn(
          `Model for table ${tableName} already exists. Skip updating schema.prisma`
        );
      } else {
        console.warn(`Model for table ${tableName} not found in schema`);
      }
    } else {
      addModelToPrisma(model, tableName, schemaFile);
      model.name = modelName;
    }

    execSync("cd backend && bun prisma format", { stdio: "ignore" });
    execSync("cd backend && bun prisma generate", { stdio: "ignore" });

    // Generate the model file
    generateModelFile(modelName, schemaFile);
    // Update the models registry
    updateModelsRegistry(modelName);
    // Create layout files
    await createLayout(modelName);
    process.exit(0);
  } catch (error) {
    console.error("Error creating model:", error);
    process.exit(1);
  }
}
