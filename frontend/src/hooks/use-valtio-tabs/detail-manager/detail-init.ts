import { ValtioTab } from "@/hooks/use-valtio-tabs/types";
import { ref } from "valtio";
import { getLayout, getModel, relationToSelect } from "../tab-utility";
import { initDetailSelect } from "./detail-select";
import { tabInitList } from "../list-manager/list-init";

export const tabDetailInit = async ({ state, action }: ValtioTab) => {
  if (!state.list.ready) {
    await tabInitList({ state, action });
  }

  if (!state.detail.ready) {
    state.detail.ready = true;
    state.detail.loading = true;

    const model = getModel(state);
    const layout = getLayout(state);

    if (model) {
      state.ref.model = ref(model);
      if (layout) {
        state.ref.layout = ref(layout);

        initDetailSelect(layout, model, state);
        action.detail.query();
      }
    }

    state.detail.loading = false;
  }
};
