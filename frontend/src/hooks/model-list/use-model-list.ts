import { layouts } from "shared/layouts";
import { useLocal } from "../use-local";
import { useModel } from "../use-model";
import { useEffect } from "react";
import { debounce } from "../utils/debounce";
import { createFetchData, createFetchUniqueValues } from "./fetch-data";
import { ModelTableState } from "./types";
import { composeHash, extractHash, parseHash } from "@/lib/parse-hash";
import { useRouter } from "@/lib/router";
import { generateHash, loadHash } from "system/utils/object-hash";

export const useModelList = ({
  model,
  variant = "default",
}: {
  model: ReturnType<typeof useModel>;
  variant: string;
}) => {
  const { currentFullPath, params } = useRouter();
  const list = useLocal<ModelTableState>({
    name: "",
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
        list.filterBy = state.filterBy;
        list.sortBy = state.sortBy;
        list.render();
      }
    } else if (hashes.parent) {
      const parentId = hashes.parent;
      const parentData = await loadHash(parentId);
      if (parentData?.parent) {
        const { modelName, columnName, rowId } = parentData.parent;
        // Store parent filter info in the table state
        list.parentFilter = { modelName, columnName, rowId };
        list.render();
      }
    }
  };

  // Load state from hash on initial render
  useEffect(() => {
    loadStateFromHashParams();
  }, []);

  // Save state to hash when filterBy or sortBy changes
  useEffect(() => {
    saveStateToHash(list.filterBy, list.sortBy);
  }, [list.filterBy, list.sortBy]);

  if (!list.debouncedFetchData) {
    list.debouncedFetchData = debounce(async (opt?: { filtering: boolean }) => {
      await list.fetchData(opt);
    }, 300);
  }

  if (model.ready) {
    const variantName =
      variant as keyof (typeof layouts)[keyof typeof layouts]["list"];
    let layout = (layouts as any)[
      model.name
    ] as (typeof layouts)[keyof typeof layouts];

    list.current = layout.list?.[variantName] || null;
    if (list.current) {
      list.available = true;
    }
  }

  useEffect(() => {
    let isMounted = true;

    if (!model.ready) {
      return;
    }

    list.fetchData = createFetchData(model, list);
    list.fetchUniqueValues = createFetchUniqueValues(model, list);
    list.fetchData();

    return () => {
      isMounted = false;
    };
  }, [model.instance, list.current]);

  // Reset and re-fetch data when path changes
  useEffect(() => {
    // Clear all state and data immediately
    const clearState = () => {
      list.filterBy = {};
      list.sortBy = {};
      list.parentFilter = undefined;
      list.result = null;
      list.unfilteredResult = null;

      console.log(list.name, params.name);
      if (list.name !== params.name) {
        list.columns = [];
        list.uniqueValues = {};
        list.loading = true;
        list.filtering = false;
        list.name = params.name;
      }
      list.loadingUniqueValues = {};
    };

    // Clear state first
    clearState();
    list.render(); // Render immediately to clear the view

    // Wait a tick to ensure old data is cleared from view
    setTimeout(() => {
      // Load new state from hash parameters and fetch new data
      loadStateFromHashParams().then(() => {
        list.fetchData().finally(() => {
          list.loading = false;
          list.render();
        });
      });
    }, 0);
  }, [currentFullPath]);

  // Apply filtering whenever filterBy, parentFilter, or data changes
  useEffect(() => {
    if (!list.unfilteredResult?.data) return;

    list.filtering = true;
    list.render();
    const data = list.unfilteredResult;

    // First apply parent filter if it exists
    let parentFiltered = data;
    if (list.parentFilter?.columnName && list.parentFilter?.rowId) {
      parentFiltered = {
        ...data,
        data: data.data.filter((row: any) => {
          // Filter based on parent relationship
          const value = list
            .parentFilter!.columnName.split(".")
            .reduce((obj: any, key: string) => obj?.[key], row);
          return value === list.parentFilter!.rowId;
        }),
      };
    }

    const hasFilters = Object.keys(list.filterBy).length > 0;

    // Then apply regular filters
    const filtered = hasFilters
      ? {
          ...parentFiltered,
          data: parentFiltered.data.filter((row: any) =>
            Object.entries(list.filterBy).every(([column, filterValues]) => {
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
    list.result = filtered;
    list.render();
  }, [list.filterBy, list.parentFilter, list.unfilteredResult]);

  return list;
};

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
