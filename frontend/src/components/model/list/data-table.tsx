import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { useModelList } from "@/hooks/model-list/use-model-list";
import { useLocal } from "@/hooks/use-local";
import { cn } from "@/lib/utils";
import { css } from "goober";
import { ChevronDown } from "lucide-react";
import { ReactElement, useEffect } from "react";
import { ModelName } from "shared/types";
import { LayoutList } from "system/model/layout/types";
import { AppLoading } from "../../app/app-loading";
import { WarnFull } from "../../app/warn-full";
import { Checkbox } from "@/components/ui/checkbox";
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
  checkbox?: LayoutList<any>["checkbox"];
  onRowClick: (row: any) => void;
  onRowSelected?: (rows: any[]) => void;
  modelTable: ReturnType<typeof useModelList>;
};

export function DataTable(props: DataTableProps) {
  const local = useLocal({
    data: [],
    columns: [] as any[],
    pagingInfo: <>-</>,
  });
  const onRowSelected = props.onRowSelected;
  const result = props.modelTable.result;
  const columns = props.modelTable.columns;
  useEffect(() => {
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
          ...columns,
        ]
      : columns;
    if (!result) {
      local.data = [];
      local.pagingInfo = <>-</>;
      local.render();
      return;
    }
    local.data = result.data;
    local.pagingInfo = (
      <>
        <sup>{Math.min(result.total, result.perPage * result.page)}</sup>
        <div className="px-1">/</div>
        <sub>{result.total}</sub>
      </>
    );
    local.render();
  }, [result?.data, columns]);

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
                        tableModel={modelTable}
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
                        modelTable={modelTable}
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
