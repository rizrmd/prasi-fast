import { ModelName } from "shared/types";
import * as models from "shared/models";

interface RelationPath {
  model: any;
  relation: any;
  column: any;
  next?: RelationPath;
}

export const getRelation = (
  modelName: ModelName,
  columnName: string
): RelationPath | undefined => {
  const model = models[modelName];

  if (!columnName.includes(".")) {
    return undefined;
  }

  const parts = columnName.split(".");
  const firstRelation = parts[0];
  const rel = model.config.relations[firstRelation];

  if (!rel) {
    return undefined;
  }

  const relModel = models[rel.model];
  if (!relModel) {
    return undefined;
  }

  // For the last part, check if it's a valid column
  if (parts.length === 2) {
    const col = relModel.config.columns[parts[1]];
    if (!col) {
      return undefined;
    }
  }

  // Build the relation path recursively
  const path: RelationPath = {
    model: relModel,
    relation: rel,
    column: parts[1],
  };

  // If there are more parts, recursively get the next relation
  if (parts.length > 2) {
    const remainingPath = parts.slice(1).join(".");
    const nextPath = getRelation(rel.model, remainingPath);
    if (nextPath) {
      path.next = nextPath;
    }
  }

  return path;
};
