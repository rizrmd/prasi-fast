import { layouts } from "shared/layouts";
import { useLocal } from "../use-local";
import { useModel } from "../use-model";
import { useEffect } from "react";
import { debounce } from "../utils/debounce";
import { createFetchData, createFetchUniqueValues } from "./fetch-data";
import { ModelTableState } from "./types";
import { generateHash, loadHash } from "@/components/model/utils/object-hash";
import { composeHash, extractHash, parseHash } from "@/lib/parse-hash";
import { useRouter } from "@/lib/router";

const saveStateToHash = async (filterBy: any, sortBy: any) => {
  if (Object.keys(filterBy).length === 0 && Object.keys(sortBy).length === 0) {
    return;
  }
  const hash = await generateHash({ filterBy, sortBy });
  location.hash = composeHash({ filter: hash });
};

const loadStateFromHash = async () => {
  const hash = extractHash("filter");
  if (!hash) return null;

  return loadHash(hash);
};

export const useModelTable = ({
  model,
}: {
  model: ReturnType<typeof useModel>;
}) => {
  const { currentFullPath } = useRouter();
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

  // Function to load state from hash
  const loadStateFromHashParams = async () => {
    const hashes = parseHash();
    if (hashes.filter) {
      const state = await loadStateFromHash();
      if (state && state.filterBy && state.sortBy) {
        table.filterBy = state.filterBy;
        table.sortBy = state.sortBy;
        table.render();
      }
    } else if (hashes.parent) {
      const parentId = hashes.parent;
      const parentData = await loadHash(parentId);
      if (parentData?.parent) {
        const { modelName, columnName, rowId } = parentData.parent;
        // Store parent filter info in the table state
        table.parentFilter = { modelName, columnName, rowId };
        table.render();
      }
    }
  };

  // Load state from hash on initial render
  useEffect(() => {
    loadStateFromHashParams();
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

    if (!model.ready) {
      return;
    }

    table.fetchData = createFetchData(model, table);
    table.fetchUniqueValues = createFetchUniqueValues(model, table);
    table.fetchData();

    return () => {
      isMounted = false;
    };
  }, [model.instance, table.current]);

  // Reset and re-fetch data when path changes
  useEffect(() => {
    // Clear all state and data immediately
    const clearState = () => {
      table.filterBy = {};
      table.sortBy = {};
      table.parentFilter = undefined;
      table.result = null;
      table.unfilteredResult = null;
      table.columns = [];
      table.uniqueValues = {};
      table.loadingUniqueValues = {};
      table.filtering = false;
      table.loading = true;
    };

    // Clear state first
    clearState();
    table.render(); // Render immediately to clear the view

    // Wait a tick to ensure old data is cleared from view
    setTimeout(() => {
      // Load new state from hash parameters and fetch new data
      loadStateFromHashParams().then(() => {
        table.fetchData().finally(() => {
          table.loading = false;
          table.render();
        });
      });
    }, 0);
  }, [currentFullPath]);

  // Apply filtering whenever filterBy, parentFilter, or data changes
  useEffect(() => {
    if (!table.unfilteredResult?.data) return;

    table.filtering = true;
    table.render();
    const data = table.unfilteredResult;

    // First apply parent filter if it exists
    let parentFiltered = data;
    if (table.parentFilter?.columnName && table.parentFilter?.rowId) {
      parentFiltered = {
        ...data,
        data: data.data.filter((row: any) => {
          // Filter based on parent relationship
          const value = table
            .parentFilter!.columnName.split(".")
            .reduce((obj: any, key: string) => obj?.[key], row);
          return value === table.parentFilter!.rowId;
        }),
      };
    }

    const hasFilters = Object.keys(table.filterBy).length > 0;

    // Then apply regular filters
    const filtered = hasFilters
      ? {
          ...parentFiltered,
          data: parentFiltered.data.filter((row: any) =>
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
      : parentFiltered;

    // Update result
    table.result = filtered;
    table.render();
  }, [table.filterBy, table.parentFilter, table.unfilteredResult]);

  return table;
};
