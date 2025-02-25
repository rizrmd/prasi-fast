import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

export async function removeLayout(modelName: string) {
  const layoutsPath = "shared/layouts.ts";
  const layoutDir = join("shared/models", modelName.toLowerCase(), "layout");

  try {
    // Remove from layouts registry
    const content = readFileSync(layoutsPath, "utf-8");
    
    // Remove the import statement
    const updatedContent = content
      .replace(
        new RegExp(
          `import \\* as ${modelName} from "./models/${modelName.toLowerCase()}/layout";\n`
        ),
        ""
      )
      // Remove from layouts object
      .replace(new RegExp(`\n?\\s*${modelName},`), "");

    writeFileSync(layoutsPath, updatedContent);

    // Remove layout directory
    try {
      execSync(`rm -rf ${layoutDir}`, { stdio: "ignore" });
    } catch (error) {
      console.error(`Warning: Could not remove layout directory: ${layoutDir}`);
    }

    return true;
  } catch (error) {
    console.error("Error removing layout:", error);
    return false;
  }
}
