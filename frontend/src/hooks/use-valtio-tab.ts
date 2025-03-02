import { useParams } from "@/lib/router";
import { getTabID, valtio_tabs } from "./use-valtio-tabs/root";
import { proxy } from "valtio";
import { ValtioTab } from "./use-valtio-tabs/types";

export const useValtioTab = (
  tabID:
    | string
    | {
        root: true;
      }
) => {
  const { params, hash } = useParams();
  let id: string = tabID as any;

  if (typeof tabID === "object") {
    id = getTabID(params as any, hash);
  }

  if (id === "") {
    return { state: proxy({ id: "" }), actions: {} } as unknown as ValtioTab;
  }
  return valtio_tabs[id];
};
