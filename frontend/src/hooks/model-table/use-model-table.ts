import { layouts } from "shared/layouts";
import { useLocal } from "../use-local";
import { useModel } from "../use-model";
import { useEffect } from "react";
import { debounce } from "../utils/debounce";
import { createFetchData, createFetchUniqueValues } from "./fetch-data";
import { ModelTableState } from "./types";

export const useModelTable = ({
  model,
}: {
  model: ReturnType<typeof useModel>;
}) => {
  const table = useLocal<ModelTableState>({
    available: false,
    loading: true,
    filtering: false,
    columns: [],
    result: null,
    current: null,
    sortBy: {},
    filterBy: {},
    fetchData: async (opt?: { filtering: boolean }) => {},
    fetchUniqueValues: async (columnName: string) => {},
    uniqueValues: {},
    loadingUniqueValues: {},
    debouncedFetchData: null,
    render: () => {},
  });

  if (!table.debouncedFetchData) {
    table.debouncedFetchData = debounce(async (opt?: { filtering: boolean }) => {
      await table.fetchData(opt);
    }, 300);
  }

  if (model.ready) {
    let layout = (layouts as any)[
      model.name
    ] as (typeof layouts)[keyof typeof layouts];

    table.current = layout?.table || null;
    if (layout && layout.table) {
      table.available = true;
    }
  }

  useEffect(() => {
    let isMounted = true;
    if (!model.ready) return;

    table.fetchData = createFetchData(model, table);
    table.fetchUniqueValues = createFetchUniqueValues(model, table);
    table.fetchData();

    return () => {
      isMounted = false;
    };
  }, [table.current, table.sortBy, table.filterBy, model.ready]);

  return table;
};
