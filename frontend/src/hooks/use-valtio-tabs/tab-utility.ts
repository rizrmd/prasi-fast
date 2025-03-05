import { layouts } from "shared/layouts";
import * as Models from "shared/models";
import { ModelName } from "shared/types";
import { RelObject } from "system/model/layout/types";
import { RelationConfig } from "system/types";
import { valtio_tabs } from "./tab-manager";
import { TabState } from "./types";

export const getModel = (tab: string | TabState) => {
  const current_tab = typeof tab === "string" ? valtio_tabs[tab]?.state : tab;
  if (current_tab) {
    const name = current_tab.config.modelName;

    return Models[name] as (typeof Models)[ModelName];
  }
};

export const getLayout = (tab: string | TabState) => {
  const current_tab = typeof tab === "string" ? valtio_tabs[tab]?.state : tab;
  if (current_tab) {
    const name = current_tab.config.modelName;

    const found = layouts[name as keyof typeof layouts];

    return found;
  }
};

export const getRelationPath = (
  rel: string | RelObject<ModelName>,
  model?: (typeof Models)[ModelName]
) => {
  // get relation in dot notation
  if (typeof rel === "string") {
    const relation = model?.config.relations[rel];
    if (!relation) return "";
    return relation.prismaField;
  } else {
    let path = "";
    const relations = getRelationModels(rel, model);
    for (const { rel } of relations) {
      path += rel.prismaField + ".";
    }
    return path;
  }
};
export const getRelationModels = (
  rel: string | RelObject<ModelName>,
  model?: (typeof Models)[ModelName]
) => {
  if (typeof rel === "string") {
    const relation = model?.config.relations[rel];
    if (!relation) return [];
    return [{ rel: relation, model: Models[relation.model] }];
  } else {
    const relations: {
      rel: RelationConfig;
      model: (typeof Models)[keyof typeof Models];
    }[] = [];

    // Recursive function to traverse relations
    const traverseRelations = (
      relObj: RelObject<ModelName>,
      currentModel: (typeof Models)[ModelName]
    ) => {
      for (const key in relObj) {
        const relation = currentModel?.config.relations[key];
        if (relation) {
          relations.push({ rel: relation, model: Models[relation.model] });

          // If the value is another RelObject, recursively traverse it
          if (typeof relObj[key] === "object") {
            const nextModel = Models[relation.model];
            traverseRelations(relObj[key] as RelObject<ModelName>, nextModel);
          }
        }
      }
    };

    if (model) {
      traverseRelations(rel, model);
    }

    return relations;
  }
};

export const relationToSelect = (
  rel: string | RelObject<ModelName>,
  model?: (typeof Models)[ModelName],
  columns?: string[]
) => {
  if (typeof rel === "string") {
    const relation = model?.config.relations[rel];
    if (!relation) return {};
    const pk = Models[relation.model].config.primaryKey;
    const select: Record<string, boolean> = { [pk]: true };
    if (columns?.length) {
      columns.forEach(col => select[col] = true);
    }
    return {
      [relation.prismaField]: {
        select
      },
    };
  } else {
    const select: Record<string, any> = {};
    const relations = getRelationModels(rel, model);

    let currentSelect = select;
    for (let i = 0; i < relations.length; i++) {
      const { rel } = relations[i];
      const prismaField = rel.prismaField;
      const pk = Models[rel.model].config.primaryKey;

      const isLast = i === relations.length - 1;
      const selectFields: Record<string, boolean> = { [pk]: true };
      
      if (isLast && columns?.length) {
        columns.forEach(col => selectFields[col] = true);
      }

      currentSelect[prismaField] = {
        select: selectFields
      };

      if (!isLast) {
        currentSelect = currentSelect[prismaField].select;
      }
    }

    return select;
  }
};
