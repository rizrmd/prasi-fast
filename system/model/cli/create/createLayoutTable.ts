import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { sortByEstimatedImportance } from "system/model/layout/utils";
import * as models from "shared/models";
import { ModelName } from "shared/types";

type LayoutItem =
  | { col: string }
  | { rel: string }
  | { rel: string; col: string }
  | { rel: Record<string, any> };

export async function createLayoutTable(modelName: string) {
  const layoutDir = join("shared/models", modelName.toLowerCase(), "layout");
  const layoutTablePath = join(layoutDir, "table.tsx");

  // Create layout directory if it doesn't exist
  mkdirSync(layoutDir, { recursive: true });

  // Load the model
  const Model = models[modelName as ModelName];
  if (!Model) {
    console.error(`Model ${modelName} not found in shared/models.ts`);
    return false;
  }

  // Generate layout items array
  const layoutItems: LayoutItem[] = [];

  // Get direct columns from this model
  const modelColumns = sortByEstimatedImportance(
    Object.keys(Model.config.columns)
  )
    .filter(
      (col) =>
        !["id", "password_hash", "verification_token", "reset_token"].includes(
          col
        )
    )
    .slice(0, 2);

  // Add direct columns
  modelColumns.forEach((col) => {
    layoutItems.push({ col });
  });

  // Handle relations
  Object.entries(Model.config.relations).forEach(([relName, relation]) => {
    if (!relation || layoutItems.length >= 7) return;

    const relatedModel = models[relation.model as ModelName];
    if (!relatedModel) return;

    const relatedColumns = Object.keys(relatedModel.config.columns);
    const importantColumn = sortByEstimatedImportance(relatedColumns).find(
      (col) =>
        !["id", "password_hash", "verification_token", "reset_token"].includes(
          col
        )
    );

    if (!importantColumn) return;

    // Add simple relation
    layoutItems.push({ rel: relName, col: importantColumn });
  });

  const content = `import { LayoutTable } from "system/model/layout/types";

export const table: LayoutTable<"${modelName}"> = {
  columns: [
    ${layoutItems
      .map((item) => {
        // For simple column
        if ("col" in item && typeof item.col === "string" && !("rel" in item)) {
          return `{ col: "${item.col}" }`;
        }
        // For simple relation with column
        if ("rel" in item && typeof item.rel === "string" && "col" in item) {
          return `{ rel: "${item.rel}", col: "${item.col}" }`;
        }
        // For nested relation object
        if ("rel" in item && typeof item.rel === "object") {
          return `{ rel: ${JSON.stringify(item.rel).replace(
            /"([^"]+)":/g,
            "$1:"
          )} }`;
        }
        // For simple relation
        if ("rel" in item && typeof item.rel === "string") {
          return `{ rel: "${item.rel}" }`;
        }
        return "";
      })
      .filter(Boolean)
      .join(",\n    ")}
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
