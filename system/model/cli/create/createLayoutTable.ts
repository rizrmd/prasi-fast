import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export async function createLayoutTable(modelName: string) {
  const layoutDir = join("shared/models", modelName.toLowerCase(), "layout");
  const layoutTablePath = join(layoutDir, "table.tsx");

  // Create layout directory if it doesn't exist
  mkdirSync(layoutDir, { recursive: true });

  const content = `import { LayoutTable } from "system/model/layout/types";

export const table: LayoutTable<"${modelName}"> = {
  columns: [
    { col: "id" },
  ],
};
`;

  try {
    writeFileSync(layoutTablePath, content);
    console.log(`Created layout table at ${layoutTablePath}`);
    return true;
  } catch (error) {
    console.error("Error creating layout table:", error);
    return false;
  }
}
