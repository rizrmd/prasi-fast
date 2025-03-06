import { useParams } from "@/lib/router";
import { TabManager, valtio_tabs } from "./use-valtio-tabs/tab-manager";

export const useValtioTab = (init?: { root: true }) => {
  const { params, hash } = useParams();

  if (typeof init === "object") {
    TabManager.init(params as any, hash);
  }

  return valtio_tabs[TabManager.state.activeTabID];
};
