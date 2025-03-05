import { listFilterToWhere } from "./list-manager/list-filter-where";
import { TabActions, TabState } from "./types";

export const createValtioTabAction = (state: TabState): TabActions => {
  const action: TabActions = {
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
        state.detail.loading = true;
        try {
          // TODO: Implement actual detail fetching
          state.detail.data = null;
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
      async create() {
        state.detail.loading = true;
        try {
          // TODO: Implement creation logic
          state.detail.data = null;
        } finally {
          state.detail.loading = false;
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
