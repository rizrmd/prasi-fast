import { ModelName } from "shared/types";
import * as Models from "shared/models";
import { parseRouteParams } from "@/lib/router";
import { nav } from "./types";
import { Tab as DraggableTabType } from "../../ext/draggable-tabs";
import { DetailHash } from "../utils/hash-type";

// Helper function to get tab index by ID
export const getTabIndexById = (id: string): number => {
  return nav.tabs.findIndex((tab) => tab.id === id);
};

// Find tab index by URL
export const findTabIndexByUrl = (url: string): number => {
  return nav.tabs.findIndex((tab) => tab.url === url);
};

export const loadLabel = async (url: string) => {
  const params = parseRouteParams(url);
  const modelName = Object.keys(Models).find(
    (key) => key.toLowerCase() === params?.name.toLowerCase()
  ) as ModelName;

  if (params && modelName && params.id) {
    const model = Models[modelName];

    if (model && !DetailHash.includes(params.id)) {
      const data = await model.findFirst(params.id);
      if (data) {
        const title = model.title(data);
        return `${modelName}: ${
          title.length > 7 ? title.substring(0, 7) + "..." : title
        }`;
      }
    }
    return modelName;
  }
};

export const saveNavState = () => {
  localStorage.setItem(
    "nav_tabs_state",
    JSON.stringify({ activeIdx: nav.activeIdx, tabs: nav.tabs })
  );
};
