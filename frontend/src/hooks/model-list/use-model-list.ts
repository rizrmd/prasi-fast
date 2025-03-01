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
import { getAccessorPath } from "./utils";

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
    // Add new methods for bulk operations
    bulkDelete: async (ids: string[] | number[]) => {},
    massUpdate: async (
      ids: string[] | number[],
      data: Record<string, any>
    ) => {},
    selectedRows: [] as (string | number)[],
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

  const variantName =
    variant as keyof (typeof layouts)[keyof typeof layouts]["list"];
  let layout = (layouts as any)[
    model.name
  ] as (typeof layouts)[keyof typeof layouts];

  if (list.current !== layout.list?.[variantName]) {
    list.current = layout.list?.[variantName] || null;
    list.columns = list.current.columns.map((column) => {
      const { path: accessorPath, models: relatedModels } = getAccessorPath(
        column,
        model.instance
      );

      const pathParts = accessorPath.split(".");
      const fieldName = pathParts[pathParts.length - 1];
      const hasRelation = pathParts.length > 1;

      let headerText;

      if (!hasRelation) {
        const columnLabel = model.instance?.config.columns[fieldName]?.label;
        headerText =
          columnLabel || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
      } else {
        const last = relatedModels[relatedModels.length - 1];

        if (last) {
          const columnLabel = last?.model.config.columns[fieldName]?.label;
          if (columnLabel) {
            headerText = columnLabel;
          } else {
            const modelLabel =
              last.model.config.tableName || last.model.config.modelName;
            headerText = `${modelLabel} ${
              fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
            }`;
          }
        } else {
          headerText = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
        }
      }

      return {
        accessorKey: accessorPath,
        header: headerText,
        meta: {
          accessorPath,
          modelName: model.name,
          columnName: accessorPath,
          type: !hasRelation
            ? model.instance?.config.columns[fieldName]?.type
            : relatedModels[relatedModels.length - 1]?.type,
          sortable: true,
          filterable: true,
        },
      };
    });
    list.available = true;
  }

  useEffect(() => {
    if (!model.ready) {
      return;
    }

    list.fetchData = createFetchData(model, list);
    list.fetchUniqueValues = createFetchUniqueValues(model, list);

    // Implement bulk delete method
    list.bulkDelete = async (ids: string[] | number[]) => {
      if (!model.instance || ids.length === 0) return;

      list.loading = true;
      list.render();

      try {
        // Get the primary key field from the model config
        const primaryKey = model.instance.config.primaryKey || "id";

        // Create a where clause for the bulk delete
        const where = {
          [primaryKey]: {
            in: ids,
          },
        };

        // Execute the delete operation
        await model.instance.deleteMany({ where });

        // Clear selected rows after successful deletion
        list.selectedRows = [];

        // Refresh the data
        await list.fetchData();
      } catch (error) {
        console.error("Error performing bulk delete:", error);
      } finally {
        list.loading = false;
        list.render();
      }
    };

    // Implement mass update method
    list.massUpdate = async (
      ids: string[] | number[],
      data: Record<string, any>
    ) => {
      if (!model.instance || ids.length === 0 || Object.keys(data).length === 0)
        return;

      list.loading = true;
      list.render();

      try {
        // Get the primary key field from the model config
        const primaryKey = model.instance.config.primaryKey || "id";

        // Create a where clause for the mass update
        const where = {
          [primaryKey]: {
            in: ids,
          },
        };

        // Execute the update operation
        await model.instance.updateMany({
          where,
          data,
        });

        // Refresh the data
        await list.fetchData();
      } catch (error) {
        console.error("Error performing mass update:", error);
      } finally {
        list.loading = false;
        list.render();
      }
    };

    list.fetchData();
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
      list.selectedRows = []; // Clear selected rows when path changes

      if (list.name !== params.name) {
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
          const value = getNestedValue(
            row,
            list.parentFilter!.columnName.split(".")
          );
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

              // Get the value using the path
              const value = getNestedValue(row, column.split("."));

              // Check if the value is in the filter values
              return filterValues.includes(value);
            })
          ),
        }
      : parentFiltered;

    // Update result
    list.result = filtered;
    list.filtering = false;
    list.render();
  }, [list.filterBy, list.parentFilter, list.unfilteredResult]);

  return list;
};

// Helper function to safely get nested values from an object
const getNestedValue = (obj: any, path: string[]): any => {
  if (!obj || path.length === 0) return undefined;

  let current = obj;

  for (const key of path) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
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
