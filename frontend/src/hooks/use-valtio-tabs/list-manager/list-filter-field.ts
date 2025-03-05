import { TabState } from "@/hooks/use-valtio-tabs/types";
import {
  getLayout,
  getModel,
  getRelationModels,
  getRelationPath,
} from "../tab-utility";

export const initFilterFields = (
  layout: ReturnType<typeof getLayout>,
  model: ReturnType<typeof getModel>,
  state: TabState
) => {
  if (layout) {
    const columns = layout.list[state.layout.list].columns;
    for (const field of columns) {
      if (!("rel" in field)) {
        const col = model?.config.columns[field.col];
        if (col) {
          state.list.filter.field.config[field.col] = {
            operator: "",
            type: col.type,
          };
        }
      } else {
        const rel = getRelationModels(field.rel, model);
        const lastRelation = rel[rel.length - 1];
        if (lastRelation) {
          const colName = field.col;
          const col = lastRelation.model.config.columns[colName];
          const path = getRelationPath(field.rel, model);
          state.list.filter.field.config[path + "." + colName] = {
            operator: "",
            type: col.type,
          };
        }
      }
    }
  }
};
