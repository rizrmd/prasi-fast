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
  closeTab(tabId: string) {},
  closeAllTabs() {},
  closeOtherTabs(tabId: string) {},
  openTab(tabId: string) {},
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
const loadTabsFromLocalStorage = () => {};
const saveTabsToLocalStorage = () => {};
