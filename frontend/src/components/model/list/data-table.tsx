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

import { Checkbox } from "@/components/ui/checkbox";
import { useModelList } from "@/hooks/model-list/use-model-list";
import { cn } from "@/lib/utils";
import { css } from "goober";
import { ChevronDown } from "lucide-react";
import { ModelName } from "shared/types";
import { LayoutList } from "system/model/layout/types";
import { AppLoading } from "../../app/app-loading";
import { WarnFull } from "../../app/warn-full";
import { DataCell } from "./cell/data-cell";
import { ModelTableHead } from "./head/table-head";
import { extractHash } from "@/lib/parse-hash";

export type ColumnMetaData = {
  modelName: ModelName;
  columnName: string;
  accessorPath: string;
  type: string;
};

export function DataTable({
  status,
  onRowClick,
  primaryKey,
  modelTable,
  checkbox,
  onRowSelected,
}: {
  primaryKey: string;
  status: "init" | "loading" | "ready";
  checkbox?: LayoutList<any>["checkbox"];
  onRowClick: (row: any) => void;
  onRowSelected?: (rows: any[]) => void;
  modelTable: ReturnType<typeof useModelList>;
}) {
  const result = modelTable.result;
  const columns = modelTable.columns;
  const table = useReactTable({
    data: result?.data || [],
    columns: checkbox?.enabled
      ? [
          {
            id: "select",
            header: ({ table }) => (
              <Checkbox
                checked={
                  table.getIsAllPageRowsSelected() ||
                  (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => {
                  table.toggleAllPageRowsSelected(!!value);
                  onRowSelected?.(
                    table.getSelectedRowModel().rows.map(row => row.original)
                  );
                }}
                aria-label="Select all"
              />
            ),
            cell: ({ row }) => (
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => {
                  row.toggleSelected(!!value);
                  onRowSelected?.(
                    table.getSelectedRowModel().rows.map(row => row.original)
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
      : columns,
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

                if (!meta) {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                }

                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "select-none",
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
                {result && (
                  <>
                    <sup>
                      {Math.min(result.total, result.perPage * result.page)}
                    </sup>
                    <div className="px-1">/</div>
                    <sub>{result.total}</sub>
                  </>
                )}
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
                  console.log(idx, cell, checkbox?.enabled);
                  if (idx === 0 && checkbox?.enabled) {
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
                      {(() => {
                        const meta = cell.column.columnDef.meta as
                          | ColumnMetaData
                          | undefined;
                        if (!meta) return null;
                        const path = meta.accessorPath.split(".");
                        const value = getNestedValue(row.original, path);

                        return (
                          <DataCell
                            colIdx={idx}
                            modelTable={modelTable}
                            modelName={meta.modelName ?? row.original.type}
                            columnName={meta.columnName ?? cell.column.id}
                            type={meta.type ?? ""}
                            value={value}
                            rowId={row.original[primaryKey]}
                          />
                        );
                      })()}
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
}

const getNestedValue = (obj: any, path: string[]): any => {
  let current = obj;
  for (const key of path) {
    if (Array.isArray(current)) {
      // If current is an array, take first element
      current = current[0];
    }
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  // Handle final value being an array
  if (Array.isArray(current)) {
    current = current[0];
  }
  return current;
};
