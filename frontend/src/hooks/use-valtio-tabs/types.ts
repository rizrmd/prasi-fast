import { layouts } from "shared/layouts";
import { ModelName } from "shared/types";
import { PaginationResult } from "system/types";
import { getLayout, getModel } from "./tab-utility";
import { LayoutList } from "system/model/layout/types";

export type Layouts = typeof layouts;
export type LayoutName = keyof Layouts;

export type TAB_ID = string;

type ColumnName = string;
export type ValtioTab = { state: TabState; action: TabActions };
export type TabState = {
  id: string;
  status: "init" | "ready";
  mode: "list" | "detail";
  ref: {
    model: ReturnType<typeof getModel>;
    layout: ReturnType<typeof getLayout>;
  };
  config: {
    modelName: ModelName;
    parent: null | {
      hash: string;
      modelName: ModelName;
      columnName: string;
      rowId: string;
      type: "hasMany";
    };
  };
  layout: {
    list: "default";
    detail: "default";
  };
  list: {
    select: any;
    filter: {
      unique: Record<
        ColumnName,
        {
          value: any;
          loading: boolean;
          options: { value: string; label: any }[];
        }
      >;
      values: Record<ColumnName, any>;
      field: {
        order: ColumnName[];
        config: Record<
          ColumnName,
          {
            type: string;
            options?: Partial<{
              operator: string;
              list: { value: string; label: string }[];
            }>;
            operator: string;
          }
        >;
      };
    };
    data: PaginationResult<any>;
    sortBy: { column: string; direction: "asc" | "desc" } | null;
    loading: boolean;
    ready: boolean;
  };
  detail: {
    idx: number;
    data: any;
    loading: boolean;
    ready: boolean;
  };
  nav:
    | (
        | { mode: "detail"; id: string }
        | {
            mode: "list";
          }
      ) & {
        modelName: string;
        hash: {
          parent: string;
          filter: string;
          prev: string;
        };
        parent?: {
          modelName: string;
          columnName: string;
          rowId: string;
          type: "hasMany" | "hasOne";
        };
        filter?: Record<string, string>;
      };
};

export type TabActions = {
  list: {
    layout: LayoutList<ModelName>;
    sort: {
      querySort(
        column: string,
        direction: "asc" | "desc" | null
      ): Promise<void>;
      reset: () => Promise<void>;
    };
    query: () => Promise<void>;
    nextPage: () => Promise<void>;
    prevPage: () => Promise<void>;
    goToPage: (page: number) => Promise<void>;
    goToFirstPage: () => Promise<void>;
    goToLastPage: () => Promise<void>;
  };
  detail: {
    save: (data: any) => Promise<void>;
    query: (id: string) => Promise<void>;
    nextItem: () => Promise<void>;
    prevItem: () => Promise<void>;
    create: () => Promise<void>;
    delete: (id: string) => Promise<void>;
  };
  mode: {
    setListMode: () => void;
    setDetailMode: () => void;
    toggle: () => void;
  };
  layout: {
    setListLayout: (layout: string) => void;
    setDetailLayout: (layout: string) => void;
  };
};
