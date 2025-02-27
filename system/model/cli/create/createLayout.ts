import { writeFileSync, mkdirSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { createLayoutTable } from "./createLayoutTable";
import { createLayoutDetail } from "./createLayoutDetail";

async function updateLayoutsRegistry() {
  const layoutsPath = "shared/layouts.ts";
  const modelsDir = "shared/models";
  let imports = "";
  let exports = "";

  try {
    const modelDirs = readdirSync(modelsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const modelName of modelDirs) {
      const layoutDir = join(modelsDir, modelName, "layout");
      try {
        // Check if layout directory exists
        readdirSync(layoutDir);
        const capitalizedModelName =
          modelName.charAt(0).toUpperCase() + modelName.slice(1);
        imports += `import * as ${capitalizedModelName} from "./models/${modelName}/layout";\n`;
        exports += `  ${capitalizedModelName},\n`;
      } catch {
        // Layout directory doesn't exist, skip
      }
    }

    const content = `${imports}
export const layouts = {
${exports.trim()}
};
`;

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

  // Create layout table first
  const detailCreated = await createLayoutDetail(modelName);
  if (!detailCreated) {
    return false;
  }

  const layoutDir = join("shared/models", modelName.toLowerCase(), "layout");
  const layoutIndexPath = join(layoutDir, "index.tsx");

  // Create layout directory if it doesn't exist
  mkdirSync(layoutDir, { recursive: true });

  const indexContent = `export { table } from "./table";\nexport * as detail from "./detail";`;

  try {
    writeFileSync(layoutIndexPath, indexContent);
    console.log(`Created layout index at ${layoutIndexPath}`);

    // Update layouts registry
    const registryUpdated = await updateLayoutsRegistry();
    if (!registryUpdated) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error creating layout:", error);
    return false;
  }
}
