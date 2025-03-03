import { PaginationResult } from "system/types";
import { layouts } from "shared/layouts";
import { ModelName } from "shared/types";
import { ReactElement, ReactNode } from "react";

export type Layouts = typeof layouts;
export type LayoutName = keyof Layouts;

export type TAB_ID = string;

type ColumnName = string;
export type ValtioTab = { state: TabState; action: TabActions };
export type TabState = {
  id: string;
  status: "init" | "ready";
  mode: "list" | "detail";
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
    filter: Record<
      ColumnName,
      { value: any; loading: boolean; options: { id: string; label: any }[] }
    >;
    data: PaginationResult<any>;
    sortBy: { column: string; direction: "asc" | "desc" } | null;
    loading: boolean;
  };
  detail: {
    idx: number;
    data: any;
    loading: boolean;
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
    filter: {
      queryOptions(name: ColumnName): Promise<void>;
      setValue(name: ColumnName, value: any): Promise<void>;
      reset(): Promise<void>;
    };
    sort: {
      querySort(
        column: string,
        direction: "asc" | "desc" | null
      ): Promise<void>;
      reset: () => Promise<void>;
    };
    query: (params?: any) => Promise<void>;
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
