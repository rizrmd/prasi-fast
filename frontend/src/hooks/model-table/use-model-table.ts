import { layouts } from "shared/layouts";
import { useLocal } from "../use-local";
import { useModel } from "../use-model";
import { useEffect } from "react";
import { debounce } from "../utils/debounce";
import { createFetchData, createFetchUniqueValues } from "./fetch-data";
import { ModelTableState } from "./types";
import { generateHash, loadHash } from "@/components/model/utils/object-hash";

const saveStateToHash = async (filterBy: any, sortBy: any) => {
  if (Object.keys(filterBy).length === 0 && Object.keys(sortBy).length === 0) {
    return;
  }
  const hash = await generateHash({ filterBy, sortBy });
  location.hash = "#filter#" + hash;
};

const loadStateFromHash = async () => {
  const hash = location.hash.replace("#filter#", "");
  if (!hash) return null;

  return loadHash(hash);
};

export const useModelTable = ({
  model,
}: {
  model: ReturnType<typeof useModel>;
}) => {
  const table = useLocal<ModelTableState>({
    available: false,
    loading: false,
    filtering: false,
    columns: [],
    result: null,
    unfilteredResult: null, // Store unfiltered data
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

  // Load state from hash on initial render
  useEffect(() => {
    if (location.hash.startsWith("#filter#")) {
      loadStateFromHash().then((state) => {
        if (state) {
          table.filterBy = state.filterBy || {};
          table.sortBy = state.sortBy || {};
          table.render();
        }
      });
    }
  }, []);

  // Save state to hash when filterBy or sortBy changes
  useEffect(() => {
    saveStateToHash(table.filterBy, table.sortBy);
  }, [table.filterBy, table.sortBy]);

  if (!table.debouncedFetchData) {
    table.debouncedFetchData = debounce(
      async (opt?: { filtering: boolean }) => {
        await table.fetchData(opt);
      },
      300
    );
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

    if (!model.ready || table.result) {
      return;
    }

    table.fetchData = createFetchData(model, table);
    table.fetchUniqueValues = createFetchUniqueValues(model, table);
    table.fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Apply filtering whenever filterBy or data changes
  useEffect(() => {
    if (!table.unfilteredResult?.data) return;

    table.filtering = true;
    table.render();
    const data = table.unfilteredResult;
    const hasFilters = Object.keys(table.filterBy).length > 0;

    // Apply filters
    const filtered = hasFilters
      ? {
          ...data,
          data: data.data.filter((row: any) =>
            Object.entries(table.filterBy).every(([column, filterValues]) => {
              if (!Array.isArray(filterValues) || filterValues.length === 0)
                return true;
              const value = column
                .split(".")
                .reduce((obj, key) => obj?.[key], row);
              return filterValues.includes(value);
            })
          ),
        }
      : data;

    // Update result
    table.result = filtered;
    table.render();
  }, [table.filterBy, table.unfilteredResult]);

  return table;
};
