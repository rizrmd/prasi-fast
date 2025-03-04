import { TabState } from "@/hooks/use-valtio-tabs/types";

export const tabInitList = (state: TabState) => {
  if (!state.list.ready) {
    state.list.ready = true;
    state.list.loading = true;
  }
};
