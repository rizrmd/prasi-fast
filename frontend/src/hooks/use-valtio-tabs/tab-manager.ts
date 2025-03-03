import cuid from "@bugsnag/cuid";
import { ModelName } from "shared/types";
import { loadHash } from "system/utils/object-hash";
import { proxy } from "valtio";
import { createValtioTabAction } from "./tab-actions";
import { createValtioTabState } from "./tab-state";
import { TabState, ValtioTab } from "./types";
import { Tab } from "@/components/ext/draggable-tabs";
import * as Models from "shared/models";

export const valtio_tabs = {} as Record<string, ValtioTab>;

type HASH_ID = string;
type MODEL_ID = string;

export const TabManager = {
  state: proxy({
    show: false,
    activeIdx: -1,
    activeTabID: "",
    tabs: [] as Tab[],
  }),
  init(
    params: { name: string; id?: string },
    hash: Partial<{ parent: HASH_ID; filter: HASH_ID; prev: MODEL_ID }>
  ) {
    loadTabsFromLocalStorage();

    if (Object.entries(valtio_tabs).length === 0) {
      parseParamsAndHash(params, hash).then((nav) => {
        this.openInNewTab(nav);
      });
    }
  },
  openInNewTab(nav: TabState["nav"]) {
    const tabID = cuid();
    const state = createValtioTabState(tabID);
    state.nav = nav;
    valtio_tabs[tabID] = {
      state,
      action: createValtioTabAction(state),
    };
    this.state.tabs.push({
      id: tabID,
      label: nav.modelName,
      url: convertNavToUrl(nav),
      closable: true,
    });

    this.state.activeIdx = this.state.tabs.length - 1;
    this.state.activeTabID = tabID;

    return tabID;
  },
  closeTab(tabId: string) {
    const idx = this.state.tabs.findIndex((tab) => tab.id === tabId);
    if (idx === -1) return;

    // Remove tab from state
    this.state.tabs.splice(idx, 1);
    delete valtio_tabs[tabId];

    // Update active tab
    if (this.state.tabs.length === 0) {
      this.state.activeIdx = -1;
      this.state.activeTabID = "";
    } else if (idx <= this.state.activeIdx) {
      this.state.activeIdx = Math.max(0, this.state.activeIdx - 1);
      this.state.activeTabID = this.state.tabs[this.state.activeIdx].id;
    }

    saveTabsToLocalStorage();
  },
  closeAllTabs() {
    this.state.tabs = [];
    this.state.activeIdx = -1;
    this.state.activeTabID = "";
    Object.keys(valtio_tabs).forEach((key) => delete valtio_tabs[key]);
    saveTabsToLocalStorage();
  },
  closeOtherTabs(tabId: string) {
    const tab = this.state.tabs.find((tab) => tab.id === tabId);
    if (!tab) return;

    // Keep only the selected tab
    Object.keys(valtio_tabs).forEach((key) => {
      if (key !== tabId) delete valtio_tabs[key];
    });

    this.state.tabs = [tab];
    this.state.activeIdx = 0;
    this.state.activeTabID = tabId;
    saveTabsToLocalStorage();
  },
  openTab(tabId: string) {
    const idx = this.state.tabs.findIndex((tab) => tab.id === tabId);
    if (idx === -1) return;

    this.state.activeIdx = idx;
    this.state.activeTabID = tabId;
    saveTabsToLocalStorage();
  },
};

const convertNavToUrl = (nav: TabState["nav"]) => {
  const name = nav.modelName.toLowerCase();
  let base = `/model/${name}`;
  if (nav.mode === "detail" && nav.id) {
    base = `/model/${name}/detail/${nav.id}`;
  }

  let hashes = "#";
  for (const [k, v] of Object.entries(nav.hash)) {
    if (v) {
      hashes += (hashes.length > 1 ? "&" : "") + `${k}=${v}`;
    }
  }
  return `${base}${hashes.length > 1 ? hashes : ""}`;
};

const parseParamsAndHash = async (
  params: { name: string; id?: string },
  hash: Partial<{ parent: HASH_ID; filter: HASH_ID; prev: MODEL_ID }>
) => {
  let parent = hash.parent ? await loadHash(hash.parent) : null;
  let filter = hash.filter ? await loadHash(hash.filter) : null;

  const modelName = Object.keys(Models).find(
    (key) => key.toLowerCase() === params.name.toLowerCase()
  ) as ModelName;

  return {
    id: params.id,
    mode: params.id ? "detail" : "list",
    modelName: modelName,
    parent,
    filter,
    hash: {
      parent: hash.parent || "",
      filter: hash.filter || "",
      prev: hash.prev || "",
    },
  } as TabState["nav"];
};

const loadTabsFromLocalStorage = () => {
  try {
    const savedTabs = localStorage.getItem("valtio-tabs");
    if (!savedTabs) return;

    const { tabs, activeIdx, activeTabID } = JSON.parse(savedTabs);

    // Restore tabs state
    tabs.forEach((tab: Tab) => {
      const savedTab = JSON.parse(
        localStorage.getItem(`valtio-tab-${tab.id}`) || "{}"
      );
      if (savedTab.state && savedTab.action) {
        valtio_tabs[tab.id] = {
          state: proxy(savedTab.state),
          action: createValtioTabAction(savedTab.state),
        };
      }
    });

    // Update tab manager state
    TabManager.state.tabs = tabs;
    TabManager.state.activeIdx = activeIdx;
    TabManager.state.activeTabID = activeTabID;
  } catch (error) {
    console.error("Error loading tabs from localStorage:", error);
  }
};

const saveTabsToLocalStorage = () => {
  try {
    // Save tab manager state
    localStorage.setItem(
      "valtio-tabs",
      JSON.stringify({
        tabs: TabManager.state.tabs,
        activeIdx: TabManager.state.activeIdx,
        activeTabID: TabManager.state.activeTabID,
      })
    );

    // Save individual tab states
    Object.entries(valtio_tabs).forEach(([tabId, tab]) => {
      localStorage.setItem(
        `valtio-tab-${tabId}`,
        JSON.stringify({
          state: tab.state,
          action: null, // We don't save the action as it will be recreated
        })
      );
    });
  } catch (error) {
    console.error("Error saving tabs to localStorage:", error);
  }
};
