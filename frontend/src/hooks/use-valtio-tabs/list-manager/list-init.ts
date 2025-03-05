import { ValtioTab } from "@/hooks/use-valtio-tabs/types";
import { ref } from "valtio";
import { getLayout, getModel, relationToSelect } from "../tab-utility";
import { initFilterFields } from "./list-filter-field";
import { initListSelect } from "./list-select";

export const tabInitList = async ({ state, action }: ValtioTab) => {
  if (!state.list.ready) {
    state.list.ready = true;
    state.list.loading = true;

    const model = getModel(state);
    const layout = getLayout(state);

    if (model) {
      state.ref.model = ref(model);
      if (layout) {
        state.ref.layout = ref(layout);

        initListSelect(layout, model, state);
        initFilterFields(layout, model, state);
        await action.list.query();
      }
    }

    state.list.loading = false;
  }
};
