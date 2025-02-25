import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { createLayoutTable } from "./createLayoutTable";

async function updateLayoutsRegistry(modelName: string) {
  const layoutsPath = "shared/layouts.ts";
  try {
    let content = "";
    try {
      content = readFileSync(layoutsPath, "utf-8");
    } catch {
      // File doesn't exist, create initial content
      content = `export const layouts = {};\n`;
    }

    // Check if import already exists
    if (
      !content.includes(
        `import * as ${modelName} from "./models/${modelName.toLowerCase()}/layout"`
      )
    ) {
      // Add new import at the top of the file
      const imports = content.split("\n\n")[0];
      const rest = content.split("\n\n").slice(1).join("\n\n");
      content = `${imports}
import * as ${modelName} from "./models/${modelName.toLowerCase()}/layout";\n\n${rest}`;
    }

    // Check if model exists in layouts object
    if (!content.includes(`${modelName},`)) {
      // Add model to layouts object
      content = content.replace(
        /export const layouts = {/,
        `export const layouts = {\n  ${modelName},`
      );
    }

    writeFileSync(layoutsPath, content);
    return true;
  } catch (error) {
    console.error("Error updating layouts registry:", error);
    return false;
  }
}

export async function createLayout(modelName: string) {
  // Create layout table first
  const tableCreated = await createLayoutTable(modelName);
  if (!tableCreated) {
    return false;
  }

  const layoutDir = join("shared/models", modelName.toLowerCase(), "layout");
  const layoutPath = join(layoutDir, "index.tsx");

  // Create layout directory if it doesn't exist
  mkdirSync(layoutDir, { recursive: true });

  const content = `export { table } from "./table";`;

  try {
    writeFileSync(layoutPath, content);
    console.log(`Created layout index at ${layoutPath}`);
    // Update layouts registry
    const registryUpdated = await updateLayoutsRegistry(modelName);
    if (!registryUpdated) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error creating layout:", error);
    return false;
  }
}
