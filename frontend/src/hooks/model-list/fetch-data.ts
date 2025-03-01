import { ColumnDef } from "@tanstack/react-table";
import { getAccessorPath, buildSelect, buildWhereClause } from "./utils";
import { ModelTableState } from "./types";

export const createFetchData = (model: any, table: ModelTableState) => {
  const fetchData = async (opt?: { filtering: boolean }) => {
    const setLoading = (value: boolean) => {
      if (opt?.filtering) {
        table.filtering = value;
      } else {
        table.loading = value;
      }
    };

    const layout = { table: table.current };
    if (!model.instance || !layout.table) {
      table.available = false;
      setLoading(false);
      table.render();
      return;
    }

    setLoading(true);
    table.render();

    try {
      const columns = layout.table.columns;
      const mappedColumns: ColumnDef<any, any>[] = columns.map((column) => {
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
            columnLabel ||
            fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
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

      const select: Record<string, any> = {};
      columns.forEach((column) => {
        if ("rel" in column) {
          if (typeof column.rel === "string") {
            select[column.rel] = {
              select: {
                [(column as any).col]: true,
              },
            };
          } else {
            const nestedSelect = buildSelect(column);
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

      const orderBy = table.sortBy;
      const data = await model.instance.findList({
        select,
        orderBy,
      });

      table.unfilteredResult = data;
      table.result = data;
      table.columns = mappedColumns;
      setLoading(false);
      table.render();
    } catch (error) {
      console.error(error);
      console.error("Error fetching table data:", error);
      setLoading(false);
      table.render();
    }
  };

  return fetchData;
};

export const createFetchUniqueValues = (model: any, table: ModelTableState) => {
  const fetchUniqueValues = async (columnName: string) => {
    if (!model.instance || !table.unfilteredResult?.data) return;

    table.loadingUniqueValues[columnName] = true;
    table.render();

    try {
      const parts = columnName.split(".");
      const values = table.unfilteredResult.data.map((row: any) => {
        return parts.reduce((obj: any, part) => obj?.[part], row);
      });

      const uniqueValues = Array.from(
        new Set(values.filter((v: any) => v !== null && v !== undefined))
      );

      table.uniqueValues[columnName] = uniqueValues;
      table.loadingUniqueValues[columnName] = false;
      table.render();
    } catch (error) {
      console.error("Error fetching unique values:", error);
      table.loadingUniqueValues[columnName] = false;
      table.render();
    }
  };

  return fetchUniqueValues;
};
