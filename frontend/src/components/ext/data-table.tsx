import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { isValidElement } from "react";
import { Spinner } from "../ui/spinner";
import { WarnFull } from "../app/warn-full";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}
export function DataTable<TData, TValue>({
  columns,
  data,
  status,
}: DataTableProps<TData, TValue> & { status: "init" | "loading" | "ready" }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
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
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {(() => {
                      const content = flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      );
                      if (Array.isArray(content)) {
                        return content.join(", ");
                      }
                      if (content !== null && typeof content === "object") {
                        // Check if it's a React element using isValidElement
                        if (isValidElement(content)) {
                          return content;
                        }
                        // For plain objects, try to stringify or return a fallback
                        try {
                          return JSON.stringify(content);
                        } catch (e) {
                          return "[Complex Object]";
                        }
                      }
                      return content;
                    })()}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 opacity-50 text-center select-none"
              >
                {status === "loading" ? (
                  <div className="flex items-center justify-center space-x-1">
                    <Spinner className="h-4 w-4 " />
                    <div>Loading...</div>
                  </div>
                ) : (
                  <WarnFull size={35}>
                    Data di tampilan ini
                    <br />
                    tidak tersedia
                  </WarnFull>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
