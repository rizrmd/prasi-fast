import { useParams } from "@/lib/router";
import { proxy } from "valtio";
import { TabManager, valtio_tabs } from "./use-valtio-tabs/tab-manager";
import { ValtioTab } from "./use-valtio-tabs/types";

export const useValtioTab = (init?: { root: true }) => {
  const { params, hash } = useParams();
  let id: string = init as any;

  if (typeof init === "object") {
    TabManager.init(params as any, hash);
  }

  if (id === "") {
    return { state: proxy({ id: "" }), actions: {} } as unknown as ValtioTab;
  }

  return valtio_tabs[TabManager.state.activeIdx];
};
