import { ColumnDef } from "@tanstack/react-table";
import { LayoutTable } from "system/model/layout/types";
import { ModelName } from "shared/types";

export type WhereClause = {
  [key: string]: {
    in?: any[];
    [key: string]: any;
  };
};

export type ModelTableState = {
  available: boolean;
  loading: boolean;
  filtering: boolean;
  columns: ColumnDef<any, any>[];
  result: any | null;
  current: LayoutTable<ModelName> | null;
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
