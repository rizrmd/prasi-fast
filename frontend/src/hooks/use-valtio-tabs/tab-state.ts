import { TabState } from "./types";
import { proxy } from "valtio";
import { ModelName } from "shared/types";

export const createValtioTabState = (tabId: string): TabState => {
  return proxy({
    id: tabId,
    status: "init",
    mode: "list",
    config: {
      modelName: "User" as ModelName,
      parent: null,
    },
    layout: {
      list: "default",
      detail: "default",
    },
    list: {
      filter: {
        fieldOrder: [],
        unique: {},
        fields: {},
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
    },
    detail: {
      idx: 0,
      data: null,
      loading: false,
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
