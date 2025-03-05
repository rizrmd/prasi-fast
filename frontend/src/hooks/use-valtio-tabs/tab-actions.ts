import { listFilterToWhere } from "./list-manager/list-filter-where";
import { TabActions, TabState } from "./types";

export const createValtioTabAction = (state: TabState): TabActions => {
  return {
    list: {
      get layout() {
        return state.ref.layout?.list[state.layout.list] as any;
      },
      sort: {
        async querySort(column, direction) {
          state.list.sortBy = direction ? { column, direction } : null;
          return Promise.resolve();
        },
        async reset() {
          state.list.sortBy = null;
          return Promise.resolve();
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
      async query(id) {
        state.detail.loading = true;
        try {
          // TODO: Implement actual detail fetching
          state.detail.data = null;
        } finally {
          state.detail.loading = false;
        }
      },
      async nextItem() {
        if (state.detail.idx < state.list.data.data.length - 1) {
          state.detail.idx++;
          const nextItem = state.list.data.data[state.detail.idx];
          if (nextItem) {
            await this.query(nextItem.id);
          }
        }
      },
      async prevItem() {
        if (state.detail.idx > 0) {
          state.detail.idx--;
          const prevItem = state.list.data.data[state.detail.idx];
          if (prevItem) {
            await this.query(prevItem.id);
          }
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
      async delete(id) {
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
};
