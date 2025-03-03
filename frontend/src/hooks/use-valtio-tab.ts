import { useParams } from "@/lib/router";
import { getTabID as initTab, valtio_tabs } from "./use-valtio-tabs/tab-init";
import { proxy } from "valtio";
import { ValtioTab } from "./use-valtio-tabs/types";

export const useValtioTab = (init?: { root: true }) => {
  const { params, hash } = useParams();
  let id: string = init as any;

  if (typeof init === "object") {
    id = initTab(params as any, hash);
  }

  if (id === "") {
    return { state: proxy({ id: "" }), actions: {} } as unknown as ValtioTab;
  }

  return valtio_tabs[id];
};
