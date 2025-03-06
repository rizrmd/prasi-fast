import { listFilterToWhere } from "./list-manager/list-filter-where";
import {
  TabManager,
  convertNavToUrl,
  parseParamsAndHash,
  valtio_tabs,
} from "./tab-manager";
import { TabActions, TabState } from "./types";
import { Tab } from "@/components/ext/draggable-tabs";

export const createValtioTabAction = (state: TabState): TabActions => {
  const action: TabActions = {
    async navigate(nav) {
      const tabID = state.id;

      // If tab doesn't exist or navigation params are invalid, return
      if (!tabID || !nav?.modelName) return;

      // Parse params and update nav state for all navigation
      const parsedNav = await parseParamsAndHash(
        {
          name: nav.modelName,
          id: "id" in nav ? nav.id : undefined,
        },
        nav.hash || {}
      );

      // If this is a new model, open in new tab
      if (nav.modelName !== state.nav.modelName) {
        const newTabID = TabManager.openInNewTab({
          id: "id" in nav ? nav.id : "",
          modelName: nav.modelName,
          mode: nav.mode || "list",
          hash: nav.hash || state.nav.hash,
        });

        const tab = valtio_tabs[newTabID];
        if (tab) {
          tab.state.nav = parsedNav;
        }
        return;
      }

      // Update existing tab's navigation state
      state.nav = {
        ...state.nav,
        ...parsedNav,
        hash: {
          ...state.nav.hash,
          ...parsedNav.hash,
        },
      };

      // Update the tab URL
      const idx = TabManager.state.tabs.findIndex(
        (tab: Tab) => tab.id === tabID
      );
      if (idx !== -1) {
        TabManager.state.tabs[idx].url = convertNavToUrl(state.nav);
      }
    },
    list: {
      get layout() {
        return state.ref.layout?.list[state.layout.list] as any;
      },
      sort: {
        async querySort(column, direction) {
          state.list.sortBy = direction ? { column, direction } : null;
          await action.list.query();
        },
        async reset() {
          state.list.sortBy = null;
          await action.list.query();
        },
      },
      async query() {
        const model = state.ref.model;
        if (model) {
          state.list.loading = true;

          try {
            const where = listFilterToWhere(state.list.filter);

            const { data, total, page, perPage, totalPages } =
              await model.findList({
                select: {
                  ...state.list.select,
                },
                orderBy: state.list.sortBy
                  ? { [state.list.sortBy.column]: state.list.sortBy.direction }
                  : undefined,
                page: state.list.data.page,
                perPage: state.list.data.perPage,
                where,
              });

            state.list.data = {
              data,
              total,
              page,
              perPage,
              totalPages,
            };
          } finally {
            state.list.loading = false;
          }
        }
      },
      async nextPage() {
        if (state.list.data.page < state.list.data.totalPages) {
          state.list.data.page++;
          await this.query();
        }
      },
      async prevPage() {
        if (state.list.data.page > 1) {
          state.list.data.page--;
          await this.query();
        }
      },
      async goToPage(page) {
        if (page >= 1 && page <= state.list.data.totalPages) {
          state.list.data.page = page;
          await this.query();
        }
      },
      async goToFirstPage() {
        state.list.data.page = 1;
        await this.query();
      },
      async goToLastPage() {
        state.list.data.page = state.list.data.totalPages;
        await this.query();
      },
    },
    detail: {
      async load(id) {
        const model = state.ref.model;
        if (!model) return;

        state.detail.loading = true;
        try {
          const primaryKey = model.config.primaryKey;

          // Find the item in list data
          const idx = state.list.data.data.findIndex(
            (item) => item[primaryKey] === id
          );
          if (idx === -1) return;

          state.detail.idx = idx;

          // Get detailed data
          const detailData = await model.findFirst({
            where: { [primaryKey]: id },
            select: state.detail.select,
          });

          // Enhance existing list data
          const enhancedData = {
            ...state.list.data.data[idx],
            ...detailData,
          };

          // Set detail data
          state.detail.data = enhancedData;

          // Set navigation
          const listData = state.list.data.data;
          state.detail.nav = {
            prevId: idx > 0 ? listData[idx - 1][primaryKey] : "",
            nextId:
              idx < listData.length - 1 ? listData[idx + 1][primaryKey] : "",
          };
        } finally {
          state.detail.loading = false;
        }
      },
      async save(data) {
        state.detail.loading = true;
        try {
          // TODO: Implement actual save logic
          state.detail.data = data;
        } finally {
          state.detail.loading = false;
        }
      },
      async query() {
        const model = state.ref.model;
        if (!model || state.nav.mode !== "detail" || !("id" in state.nav))
          return;

        state.detail.loading = true;
        try {
          const primaryKey = model.config.primaryKey;

          // Find current item index in list data
          const currentIdx = state.list.data.data.findIndex(
            (item) =>
              state.nav.mode === "detail" && item[primaryKey] === state.nav.id
          );
          state.detail.idx = currentIdx;

          // Set navigation ids
          const listData = state.list.data.data;
          state.detail.nav = {
            prevId: currentIdx > 0 ? listData[currentIdx - 1][primaryKey] : "",
            nextId:
              currentIdx < listData.length - 1
                ? listData[currentIdx + 1][primaryKey]
                : "",
          };

          // Fetch detailed data
          const detailData = await model.findFirst({
            where: { [primaryKey]: state.nav.id },
            select: state.detail.select,
          });
          state.detail.data = detailData;
        } finally {
          state.detail.loading = false;
        }
      },
      async nextItem() {
        state.nav.mode = "detail";
        if (state.nav.mode === "detail" && state.detail.nav.prevId) {
          state.nav.id = state.detail.nav.nextId;
          await this.query();
        }
      },
      async prevItem() {
        state.nav.mode = "detail";
        if (state.nav.mode === "detail" && state.detail.nav.prevId) {
          state.nav.id = state.detail.nav.prevId;
          await this.query();
        }
      },
      async delete() {
        state.detail.loading = true;
        try {
          // TODO: Implement deletion logic
        } finally {
          state.detail.loading = false;
        }
      },
    },
    mode: {
      setListMode() {
        state.mode = "list";
      },
      setDetailMode() {
        state.mode = "detail";
      },
      toggle() {
        state.mode = state.mode === "list" ? "detail" : "list";
      },
    },
    layout: {
      setListLayout(layout: string) {
        state.layout.list = "default";
      },
      setDetailLayout(layout: string) {
        state.layout.detail = "default";
      },
    },
  };
  return action;
};
