import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocal } from "@/hooks/use-local";
import { useValtioTab } from "@/hooks/use-valtio-tab";
import { cn } from "@/lib/utils";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { css } from "goober";
import { ChevronDown } from "lucide-react";
import { ReactElement, useEffect } from "react";
import { ModelName } from "shared/types";
import { AppLoading } from "../../app/app-loading";
import { WarnFull } from "../../app/warn-full";
import { DataCell } from "./cell/data-cell";
import { ModelTableHead } from "./head/table-head";

export type ColumnMetaData = {
  modelName: ModelName;
  columnName: string;
  accessorPath: string;
  type: string;
};
type DataTableProps = {
  primaryKey: string;
  status: "init" | "loading" | "ready";
  checkbox?: {
    enabled: boolean;
  };
  onRowClick: (row: any) => void;
  onRowSelected?: (rows: any[]) => void;
  modelTable: ReturnType<typeof useValtioTab>;
  tabId: string;
};

export function DataTable(props: DataTableProps) {
  const local = useLocal<{
    data: any[];
    columns: any[];
    pagingInfo: ReactElement;
  }>({
    data: [],
    columns: [],
    pagingInfo: <>-</>,
  });

  const onRowSelected = props.onRowSelected;
  const tab = props.modelTable;
  const result = tab.list;

  // Derive columns from layout
  useEffect(() => {
    if (!tab.config?.layout?.list?.default?.columns) {
      local.columns = [];
      local.render();
      return;
    }

    // Extract columns from layout
    const layoutColumns = tab.config?.layout?.list?.default?.columns;
    const derivedColumns = Array.isArray(layoutColumns)
      ? layoutColumns.map((col: any, index: number) => {
          // Convert layout column definition to table column format
          const isRelation = col.rel ? true : false;
          let relationType = "data";
          let accessorPath = col.col || col.rel;

          if (isRelation) {
            // Get the relation type from the model configuration
            const relationParts = col.rel.split(".");
            const relationName = relationParts[0];

            // Access relations from the model instead of tab.config
            const model = tab.config?.model;
            const relation = model?.config?.relations?.[relationName];
            relationType = relation?.type || "relation";

            // For relations, ensure the accessorPath is correctly set
            if (col.col) {
              // If both rel and col are specified, the accessorPath should be rel.col
              accessorPath = `${col.rel}.${col.col}`;
            }
          }

          return {
            accessorKey: col.col || col.rel,
            header: col.header || col.col || col.rel,
            meta: {
              modelName: tab.config?.modelName,
              columnName: col.col
                ? col.rel
                  ? `${col.rel}.${col.col}`
                  : col.col
                : col.rel,
              accessorPath: accessorPath,
              type: isRelation ? relationType : "data",
            },
          };
        })
      : [];

    local.columns = props.checkbox?.enabled
      ? [
          {
            id: "select",
            header: ({ table }: any) => (
              <Checkbox
                checked={
                  table.getIsAllPageRowsSelected() ||
                  (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => {
                  table.toggleAllPageRowsSelected(!!value);
                  onRowSelected?.(
                    table
                      .getSelectedRowModel()
                      .rows.map((row: any) => row.original)
                  );
                }}
                aria-label="Select all"
              />
            ),
            cell: ({ row, table }: any) => (
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => {
                  row.toggleSelected(!!value);
                  onRowSelected?.(
                    table
                      .getSelectedRowModel()
                      .rows.map((row: any) => row.original)
                  );
                }}
                aria-label="Select row"
              />
            ),
            enableSorting: false,
            enableHiding: false,
          },
          ...derivedColumns,
        ]
      : derivedColumns;

    if (!result) {
      local.data = [];
      local.pagingInfo = <>-</>;
      local.render();
      return;
    }
    local.data = result.data ? [...result.data] : [];
    local.pagingInfo = (
      <>
        <sup>
          {Math.min(
            result.total || 0,
            (result.perPage || 0) * (result.page || 0)
          )}
        </sup>
        <div className="px-1">/</div>
        <sub>{result.total || 0}</sub>
      </>
    );
    local.render();
  }, [
    result?.data,
    tab.config?.layout?.list?.default?.columns,
    props.checkbox?.enabled,
    props.tabId,
  ]);

  return (
    <InternalDataTable
      {...props}
      data={local.data}
      columns={local.columns}
      pagingInfo={local.pagingInfo}
    />
  );
}

const InternalDataTable = ({
  status,
  onRowClick,
  data,
  columns,
  checkbox,
  modelTable,
  pagingInfo,
  primaryKey,
  tabId,
}: DataTableProps & {
  data: any[];
  columns: any[];
  pagingInfo: ReactElement;
}) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header, idx) => {
                const meta = (header.column.columnDef as any)?.meta as
                  | undefined
                  | ColumnMetaData;

                if (!meta)
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(header.id === "select" && "w-[33px]")}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );

                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "select-none w-[200px]",
                      css`
                        padding: 0;
                        height: auto;
                      `
                    )}
                  >
                    {header.isPlaceholder ? null : (
                      <ModelTableHead
                        colIdx={idx}
                        tabId={tabId}
                        columnName={meta.columnName}
                        modelName={meta.modelName}
                        className={cn(
                          idx === 0 && !checkbox?.enabled && "pl-3"
                        )}
                      />
                    )}
                  </TableHead>
                );
              })}
              <TableHead className="select-none flex justify-end items-center">
                {pagingInfo}
              </TableHead>
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(
                  "cursor-pointer hover:bg-blue-50",
                  css`
                    &:hover {
                      .action {
                        opacity: 1;
                      }
                    }
                  `
                )}
                onClick={() => {
                  onRowClick({ ...row.original });
                }}
              >
                {row.getVisibleCells().map((cell, idx) => {
                  if (cell.column.id === "select") {
                    return (
                      <TableCell key={cell.id} className="w-[30px]">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell
                      key={cell.id}
                      className={idx === 0 && !checkbox?.enabled ? "pl-3" : ""}
                    >
                      <DataCell
                        colIdx={idx}
                        tabId={tabId}
                        cell={cell}
                        row={row}
                        rowId={row.original[primaryKey]}
                      />
                    </TableCell>
                  );
                })}
                <TableCell className="flex items-center justify-end">
                  <div
                    className="opacity-0 action transition-all border rounded-sm px-1 hover:bg-white hover:border-blue-400 hover:text-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <ChevronDown size={15} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1 + (checkbox?.enabled ? 1 : 0)}
                className="h-24 opacity-50 text-center select-none"
              >
                {status === "loading" ? (
                  <AppLoading />
                ) : (
                  <WarnFull size={35}>Data Kosong</WarnFull>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
