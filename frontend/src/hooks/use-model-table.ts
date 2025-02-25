import { layouts } from "shared/layouts";
import { useLocal } from "./use-local";
import { useModel } from "./use-model";
import { useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";

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

    const fetchData = async () => {
      if (!table.ready || !model.instance || !layout?.table) return;

      table.loading = true;
      table.render();

      try {
        const columns = layout.table.columns;
        const mappedColumns: ColumnDef<any, any>[] = columns.map((column) => {
          const accessorKey =
            "rel" in column ? `${column.rel}.${column.col}` : column.col;
          return {
            accessorKey,
            header: accessorKey
              .split(".")
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              .join(" "),
            cell: ({ row }) => {
              if ("rel" in column) {
                const relData = row.original[column.rel];
                return relData ? relData[column.col] ?? "N/A" : "N/A";
              }
              return row.getValue(accessorKey) ?? "N/A";
            },
          };
        });

        const select: Record<string, any> = {};

        columns.forEach((column) => {
          if ("rel" in column) {
            select[column.rel] = {
              select: {
                [column.col]: true,
              },
            };
          } else {
            select[column.col] = true;
          }
        });

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
