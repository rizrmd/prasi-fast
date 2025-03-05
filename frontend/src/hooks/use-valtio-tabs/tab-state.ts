import { TabState } from "./types";
import { proxy } from "valtio";
import { ModelName } from "shared/types";
import { getLayout, getModel } from "./tab-utility";

export const createValtioTabState = (tabId: string): TabState => {
  return proxy({
    id: tabId,
    status: "init",
    mode: "list",
    config: {
      modelName: "User" as ModelName,
      parent: null,
    },
    ref: {
      model: undefined as ReturnType<typeof getModel>,
      layout: undefined as ReturnType<typeof getLayout>
    },
    layout: {
      list: "default",
      detail: "default",
    },
    list: {
      select: {} as Record<string, boolean>,
      filter: {
        unique: {} as Record<string, {
          value: any;
          loading: boolean;
          options: { value: string; label: any }[];
        }>,
        values: {},
        field: {
          order: [],
          config: {},
        }
      },
      data: {
        data: [],
        total: 0,
        page: 1,
        perPage: 10,
        totalPages: 1,
      },
      sortBy: null,
      loading: false,
      ready: false,
    },
    detail: {
      idx: 0,
      data: null,
      loading: false,
      ready: false,
    },
    nav: {
      mode: "list",
      modelName: "",
      hash: {
        filter: "",
        parent: "",
        prev: "",
      },
    },
  });
};
