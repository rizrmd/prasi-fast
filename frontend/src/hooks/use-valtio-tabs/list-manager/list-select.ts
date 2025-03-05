import { getLayout, getModel, relationToSelect } from "../tab-utility";
import { TabState } from "../types";

export const initListSelect = (
  layout: Exclude<ReturnType<typeof getLayout>, undefined>,
  model: ReturnType<typeof getModel>,
  state: TabState
) => {
  const select: any = {};
  const columns = layout.list[state.layout.list].columns;
  for (const field of columns) {
    if (!("rel" in field)) {
      select[field.col] = true;
    } else {
      const relSelect = relationToSelect(field.rel, model, [field.col]);
      for (const [k, v] of Object.entries(relSelect)) {
        select[k] = v;
      }
    }
  }
  state.list.select = select;
};
