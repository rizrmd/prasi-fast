import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { sortByEstimatedImportance } from "system/model/layout/utils";
import * as models from "shared/models";
import { ModelName } from "shared/types";
import { LayoutDetail } from "system/model/layout/types";

export async function createLayoutDetail(modelName: string) {
  const layoutDir = join("shared/models", modelName.toLowerCase(), "layout");
  const layoutDetailPath = join(layoutDir, "detail.tsx");

  // Create layout directory if it doesn't exist
  mkdirSync(layoutDir, { recursive: true });

  // Load the model
  const Model = models[modelName as ModelName];
  if (!Model) {
    console.error("Model " + modelName + " not found in shared/models.ts");
    return false;
  }

  const content = `import { LayoutDetail } from "system/model/layout/types";

export const detail: LayoutDetail<"${modelName}"> = {
  fields: {
    vertical: [
      { horizontal: [] },
    ],
  },
  tabs: [
    { title: "Detail", type: "default" },
    { title: "User", type: "relation", name: "user" },
  ],
};
`;

  try {
    writeFileSync(layoutDetailPath, content);
    console.log("Created layout detail at " + layoutDetailPath);
    return true;
  } catch (error) {
    console.error("Error creating layout detail:", error);
    return false;
  }
}
