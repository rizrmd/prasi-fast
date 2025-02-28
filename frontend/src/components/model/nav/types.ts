import { ModelName } from "shared/types";
import { Tab as DraggableTabType } from "../../ext/draggable-tabs";

export type NavType = {
  activeIdx: number;
  tabs: DraggableTabType[];
};

export const STORAGE_KEY = "nav_tabs_state";

export const nav = {
  activeIdx: 0,
  show: false,
  tabs: [] as DraggableTabType[],
  render: () => {},
};
