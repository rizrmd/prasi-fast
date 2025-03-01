import { ColumnDef } from "@tanstack/react-table";
import { LayoutList } from "system/model/layout/types";
import { ModelName } from "shared/types";

export type WhereClause = {
  [key: string]: {
    in?: any[];
    [key: string]: any;
  };
};

export type ParentFilter = {
  modelName: string;
  columnName: string;
  rowId: string | number;
};

export type ModelTableState = {
  name: string;
  available: boolean;
  loading: boolean;
  filtering: boolean;
  parentFilter?: ParentFilter;
  columns: ColumnDef<any, any>[];
  result: any | null;
  unfilteredResult: any | null;
  current: LayoutList<ModelName> | null;
  sortBy: Record<string, "asc" | "desc">;
  filterBy: Record<string, any[]>;
  fetchData: (opt?: { filtering: boolean }) => Promise<void>;
  fetchUniqueValues: (columnName: string) => Promise<void>;
  uniqueValues: Record<string, any[]>;
  loadingUniqueValues: Record<string, boolean>;
  debouncedFetchData: null | ((opt?: { filtering: boolean }) => void);
  render: () => void;
};

export interface ModelRow {
  [key: string]: any;
}
