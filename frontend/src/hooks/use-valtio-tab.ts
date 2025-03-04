import { useParams } from "@/lib/router";
import { TabManager, valtio_tabs } from "./use-valtio-tabs/tab-manager";
import { createValtioTabState } from "./use-valtio-tabs/tab-state";
import { ValtioTab } from "./use-valtio-tabs/types";

export const useValtioTab = (init?: { root: true }) => {
  const { params, hash } = useParams();

  if (typeof init === "object") {
    TabManager.init(params as any, hash);
  }

  return valtio_tabs[TabManager.state.activeTabID];
};
