import { PaginationResult } from "system/types";
import { useLocal } from "./use-local";
import { ModelName, Models } from "shared/types";
import * as models from "shared/models";
import { layouts } from "shared/layouts";
import { useParams } from "@/lib/router";
import { parseHash } from "@/lib/parse-hash";
import { loadHash } from "system/utils/object-hash";

type Layouts = typeof layouts;
type TAB_ID = string;
type TabData = {
  mode: "list" | "detail" | "detail-tab";
  config: {
    modelName: string;
    model: Models[ModelName];
    layout: Layouts[keyof Layouts];
    parent: null | {
      hash: string;
      modelName: string;
      columnName: string;
      rowId: string;
      type: "hasMany";
      model: Models[ModelName];
    };
  };
  list: PaginationResult<any>;
  detail: {
    idx: number;
    data: any;
  };
  detailTab: {
    mode: "list" | "detail";
    tab: string;
    list: PaginationResult<any>;
    detail: {
      idx: number;
      data: any;
    };
  };
};
export const tab_data = {} as Record<TAB_ID, TabData>;

export const useModelTab = (tab_id: TAB_ID) => {
  const params = useParams();
  const local = useLocal({
    status: "init" as "init" | "loading" | "ready",
    get mode() {
      return tab.mode;
    },
    get config() {
      return tab.config;
    },
    get list() {
      return tab.list;
    },
    get detail() {
      return tab.detail;
    },
    get detailTab() {
      return tab.detailTab;
    },
    op: {
      detail: {
        get canNext() {
          if (!tab || tab.mode !== "detail") return false;
          return tab.detail.idx < tab.list.data.length - 1;
        },
        get canPrev() {
          if (!tab || tab.mode !== "detail") return false;
          return tab.detail.idx > 0;
        },
        next() {
          if (!tab || tab.mode !== "detail") return;

          const nextIdx = tab.detail.idx + 1;
          if (nextIdx < tab.list.data.length) {
            tab.detail = {
              idx: nextIdx,
              data: tab.list.data[nextIdx],
            };
            local.render();
          }
        },
        prev() {
          if (!tab || tab.mode !== "detail") return;

          const prevIdx = tab.detail.idx - 1;
          if (prevIdx >= 0) {
            tab.detail = {
              idx: prevIdx,
              data: tab.list.data[prevIdx],
            };
            local.render();
          }
        },
      },
      detailTab: {
        get canNext() {
          if (
            !tab ||
            tab.mode !== "detail-tab" ||
            tab.detailTab.mode !== "detail"
          )
            return false;
          return tab.detailTab.detail.idx < tab.detailTab.list.data.length - 1;
        },
        get canPrev() {
          if (
            !tab ||
            tab.mode !== "detail-tab" ||
            tab.detailTab.mode !== "detail"
          )
            return false;
          return tab.detailTab.detail.idx > 0;
        },
        next() {
          if (
            !tab ||
            tab.mode !== "detail-tab" ||
            tab.detailTab.mode !== "detail"
          )
            return;

          const nextIdx = tab.detailTab.detail.idx + 1;
          if (nextIdx < tab.detailTab.list.data.length) {
            tab.detailTab.detail = {
              idx: nextIdx,
              data: tab.detailTab.list.data[nextIdx],
            };
            local.render();
          }
        },
        prev() {
          if (
            !tab ||
            tab.mode !== "detail-tab" ||
            tab.detailTab.mode !== "detail"
          )
            return;

          const prevIdx = tab.detailTab.detail.idx - 1;
          if (prevIdx >= 0) {
            tab.detailTab.detail = {
              idx: prevIdx,
              data: tab.detailTab.list.data[prevIdx],
            };
            local.render();
          }
        },
        selectDetailItem(idx: number) {
          if (!tab || tab.mode !== "detail-tab") return;

          if (idx >= 0 && idx < tab.detailTab.list.data.length) {
            tab.detailTab.detail = {
              idx,
              data: tab.detailTab.list.data[idx],
            };
            tab.detailTab.mode = "detail";
            local.render();
          }
        },
      },
      queryList(params?: any) {
        return new Promise<void>(async (resolve) => {
          try {
            if (!tab.config.model) {
              throw new Error("Model not configured");
            }

            const result = await tab.config.model.findList(params);
            tab.list = result;
            tab.mode = "list";
            resolve();
          } catch (error) {
            console.error("Error querying list:", error);
            resolve();
          }
        });
      },
      queryDetail(id: string) {
        return new Promise<void>(async (resolve) => {
          try {
            if (!tab.config.model) {
              throw new Error("Model not configured");
            }

            const data = await tab.config.model.findFirst(id);
            if (data) {
              tab.detail = {
                idx: tab.list.data.findIndex((item) => item.id === id) || 0,
                data,
              };
              tab.mode = "detail";
            }
            resolve();
          } catch (error) {
            console.error("Error querying detail:", error);
            resolve();
          }
        });
      },
      queryDetailTab(tabName: string, params?: any) {
        return new Promise<void>(async (resolve) => {
          try {
            if (!tab.config.model || !tab.detail.data) {
              throw new Error("Model or detail data not configured");
            }

            // Use getRelation method to get related data
            const relationData = await tab.config.model.getRelation(tabName);

            // Convert the relation data to a pagination result format
            const result = Array.isArray(relationData)
              ? {
                  data: relationData,
                  total: relationData.length,
                  page: 1,
                  perPage: relationData.length,
                  totalPages: 1,
                }
              : {
                  data: relationData ? [relationData] : [],
                  total: relationData ? 1 : 0,
                  page: 1,
                  perPage: 1,
                  totalPages: 1,
                };

            tab.detailTab = {
              mode: "list",
              tab: tabName,
              list: result,
              detail: {
                idx: 0,
                data: null,
              },
            };

            tab.mode = "detail-tab";
            resolve();
          } catch (error) {
            console.error("Error querying detail tab:", error);
            resolve();
          }
        });
      },
      setConfig(config: typeof tab.config) {
        tab.config = config;
      },
      setMode(mode: typeof tab.mode) {
        tab.mode = mode;
      },
      selectDetailItem(idx: number) {
        if (tab.mode === "list" && tab.list.data[idx]) {
          tab.detail = {
            idx,
            data: tab.list.data[idx],
          };
          tab.mode = "detail";
        } else if (tab.mode === "detail-tab" && tab.detailTab.list.data[idx]) {
          tab.detailTab.detail = {
            idx,
            data: tab.detailTab.list.data[idx],
          };
        }
      },
      setDetailTabMode(mode: TabData["detailTab"]["mode"]) {
        if (!tab || tab.mode !== "detail-tab") return;
        tab.detailTab.mode = mode;
        local.render();
      },
      refreshList() {
        if (!tab) return;
        return this.queryList();
      },
      refreshDetail() {
        if (!tab || !tab.detail.data || !tab.detail.data.id) return;
        return this.queryDetail(tab.detail.data.id);
      },
      refreshDetailTab() {
        if (!tab || tab.mode !== "detail-tab" || !tab.detailTab.tab) return;
        return this.queryDetailTab(tab.detailTab.tab);
      },
      goBack() {
        if (!tab) return;

        if (tab.mode === "detail") {
          tab.mode = "list";
          local.render();
        } else if (tab.mode === "detail-tab") {
          if (tab.detailTab.mode === "detail") {
            tab.detailTab.mode = "list";
          } else {
            tab.mode = "detail";
          }
          local.render();
        }
      },
    },
  });

  if (!tab_data[tab_id] && local.status !== "loading") {
    local.status = "loading";
    initTab(tab_id, params as any).then(() => {
      local.status = "ready";
      local.render();
    });
  } else if (tab_data[tab_id] && local.status !== "ready") {
    local.status = "ready";
    local.render();
  }

  const tab = tab_data[tab_id];

  return local;
};

const initTab = async (id: string, params: { id: string; name: string }) => {
  const modelName = Object.keys(models).find((e) => {
    if (e.toLowerCase() === params.name) {
      return e;
    }
  }) as ModelName;
  const hash = parseHash();
  if (!modelName) return;

  let parent: TabData["config"]["parent"] = null;
  if (hash.parent) {
    parent = await loadHash(hash.parent);
  }

  const model = models[modelName];
  const layout = layouts[modelName];
  tab_data[id] = {
    mode: "list",
    config: {
      modelName,
      layout,
      model,
      parent,
    },
    list: {
      data: [],
      total: 0,
      page: 1,
      perPage: 10,
      totalPages: 1,
    },
    detail: {
      idx: 0,
      data: null,
    },
    detailTab: {
      mode: "list",
      tab: "",
      list: {
        data: [],
        total: 0,
        page: 1,
        perPage: 10,
        totalPages: 1,
      },
      detail: {
        idx: 0,
        data: null,
      },
    },
  };
};
