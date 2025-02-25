import { layouts } from "shared/layouts";
import { useLocal } from "./use-local";
import { useModel } from "./use-model";
import { useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";

import * as Models from "shared/models";

export const useModelTable = ({
  model,
}: {
  model: ReturnType<typeof useModel>;
}) => {
  const table = useLocal({
    ready: false,
    available: false,
    loading: false,
    columns: [] as ColumnDef<any, any>[],
    result: null as Awaited<
      ReturnType<Exclude<(typeof model)["instance"], null>["findMany"]>
    > | null,
  });

  let layout = (layouts as any)[
    model.name
  ] as (typeof layouts)[keyof typeof layouts];

  useEffect(() => {
    if (model.ready) {
      table.ready = true;
      if (layout && layout.table) {
        table.available = true;
      }
    } else {
      table.ready = false;
    }
    table.render();
  }, [model.ready, layout]);

  useEffect(() => {
    let isMounted = true;

    const getModelInfo = (relationName: string) => {
      const modelName = Object.keys(Models).find(
        (key) => key.toLowerCase() === relationName.toLowerCase()
      );
      return modelName ? (Models as any)[modelName] : null;
    };

    const getAccessorPath = (
      column: any
    ): {
      path: string;
      models: {
        model: any;
        type: "hasMany" | "belongsTo" | "hasOne" | undefined;
      }[];
    } => {
      if (!("rel" in column)) return { path: column.col, models: [] };

      if (typeof column.rel === "string") {
        const relModel = getModelInfo(column.rel);
        return {
          path: `${column.rel}.${column.col}`,
          models: relModel
            ? [
                {
                  model: relModel,
                  type: model.instance?.config.relations[column.rel].type,
                },
              ]
            : [],
        };
      }

      const paths: string[] = [];
      const models: any[] = [];

      const processRelObject = (obj: any, parentModel: any = null): void => {
        if ("col" in obj) {
          paths.push(obj.col);
          return;
        }

        const key = Object.keys(obj)[0];
        const value = obj[key];

        if (paths.length === 0) {
          // First level relation
          paths.push(key);
          const currentModel = getModelInfo(key);
          if (currentModel) {
            models.push(currentModel);
            if (typeof value === "object") {
              processRelObject(value, currentModel);
            }
          }
        } else {
          // Nested relations - use parent model's relations to get next model
          if (parentModel) {
            paths.push(key);
            const relationConfig = parentModel.config.relations[key];
            if (relationConfig) {
              const nextModel = getModelInfo(relationConfig.model);
              if (nextModel) {
                models.push(nextModel);
                if (typeof value === "object") {
                  processRelObject(value, nextModel);
                }
              }
            }
          }
        }
      };

      processRelObject(column.rel);
      return { path: paths.join("."), models };
    };

    const buildSelect = (column: any): any => {
      if (!("rel" in column)) {
        return true;
      }

      if (typeof column.rel === "string") {
        return {
          [column.rel]: {
            select: {
              [column.col]: true,
            },
          },
        };
      }

      const processRelObject = (obj: any): any => {
        if ("col" in obj) {
          return { [obj.col]: true };
        }

        const key = Object.keys(obj)[0];
        const value = obj[key];

        if ("col" in value) {
          return {
            [key]: {
              select: {
                [value.col]: true,
              },
            },
          };
        }

        const nestedValue = processRelObject(value);

        return {
          [key]: {
            select: nestedValue,
          },
        };
      };

      return processRelObject(column.rel);
    };

    const fetchData = async () => {
      if (!table.ready || !model.instance || !layout?.table) return;

      table.loading = true;
      table.render();

      try {
        const columns = layout.table.columns;
        const mappedColumns: ColumnDef<any, any>[] = columns.map((column) => {
          const { path: accessorPath, models: relatedModels } =
            getAccessorPath(column);

          // Get field name from the end of the path
          const pathParts = accessorPath.split(".");
          const fieldName = pathParts[pathParts.length - 1];
          const hasRelation = pathParts.length > 1;

          // Get label from the model config
          let headerText;

          if (!hasRelation) {
            // For direct columns, get label from current model
            const columnLabel =
              model.instance?.config.columns[fieldName]?.label;
            headerText =
              columnLabel ||
              fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
          } else {
            // For related path, get the last model in the chain (deepest relation)
            const last = relatedModels[relatedModels.length - 1];

            if (last) {
              // Get the column label from the last model if it exists
              const columnLabel = last?.model.config.columns[fieldName]?.label;
              if (columnLabel) {
                headerText = columnLabel;
              } else {
                // Fallback: Use last model's name + field
                const modelLabel =
                  last.model.config.tableName || last.model.config.modelName;
                headerText = `${modelLabel} ${
                  fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
                }`;
              }
            } else {
              // Ultimate fallback if no model found
              headerText =
                fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
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
            },
          };
        });

        const select: Record<string, any> = {};
        columns.forEach((column) => {
          if ("rel" in column) {
            if (typeof column.rel === "string") {
              select[column.rel] = {
                select: {
                  [column.col]: true,
                },
              };
            } else {
              const nestedSelect = buildSelect(column);
              // Merge nested selections at the same level
              for (const [key, value] of Object.entries(nestedSelect)) {
                if (select[key] && select[key].select) {
                  select[key].select = {
                    ...select[key].select,
                    ...(value as any).select,
                  };
                } else {
                  select[key] = value;
                }
              }
            }
          } else {
            select[column.col] = true;
          }
        });

        // Log the final select object
        const result = await model.instance.findMany({
          select,
        });

        if (isMounted) {
          table.columns = mappedColumns;
          table.result = result as any;
          table.loading = false;
          table.render();
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching table data:", error);
          table.loading = false;
          table.render();
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [table.ready, model.instance, layout?.table]);

  return table;
};
