import { ColumnDef } from "@tanstack/react-table";
import { getAccessorPath, buildSelect, buildWhereClause } from "./utils";
import { ModelTableState } from "./types";

// Define a recursive type for the orderBy object
type OrderByValue = string | { orderBy: OrderByObject };
type OrderByObject = Record<string, OrderByValue>;

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

      // Transform the sortBy object to handle relation columns
      const orderBy: OrderByObject = {};
      
      // Process each sort field
      for (const [key, direction] of Object.entries(table.sortBy)) {
        if (key.includes('.')) {
          // For relation columns, we need to construct a proper orderBy object
          // that follows the Prisma nested orderBy syntax
          const parts = key.split('.');
          let current: any = orderBy;
          
          // Build the nested orderBy structure
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
              current[part] = { orderBy: {} };
            }
            current = current[part].orderBy;
          }
          
          // Set the sort direction for the last part
          current[parts[parts.length - 1]] = direction;
        } else {
          // For regular columns, just use the key directly
          orderBy[key] = direction as string;
        }
      }

      // Build where clause for filtering
      const where = buildWhereClause(table.filterBy);

      // Fetch data with the transformed orderBy and where
      const data = await model.instance.findList({
        select,
        orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
        where,
      });

      table.unfilteredResult = data;
      table.result = data;
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
