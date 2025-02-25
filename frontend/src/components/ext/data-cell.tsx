import { FC, useState } from "react";
import { ModelName } from "shared/types";
import { Popover, PopoverContent } from "../ui/popover";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  ExternalLink,
  Filter,
  Link2,
  Pencil,
  SquareArrowDown,
  SquareArrowUpRight,
} from "lucide-react";

const cell = { popover: "" };

export const DataCell: FC<{
  modelName: ModelName;
  columnName: string;
  value?: any;
  rowId: string;
  colIdx?: number;
}> = (props) => {
  const { value, modelName, columnName, rowId, colIdx } = props;
  const render = useState({})[1];
  const cellId = `${modelName}-${columnName}-${rowId}-${colIdx}`;

  const select = (action: string) => {
    cell.popover = "";
    render({});
  };
  return (
    <div className="flex flex-1">
      <Popover
        open={cell.popover === cellId}
        onOpenChange={(open) => {
          if (!open) {
            cell.popover = "";
            render({});
          }
        }}
      >
        <PopoverTrigger
          onClick={() => {
            cell.popover = cell.popover === cellId ? "" : cellId;
            render({});
          }}
        >
          <div
            className={cn(
              "px-2 cursor-pointer -ml-2 border transition-all  rounded-full select-none",
              cell.popover === cellId
                ? "bg-blue-50 border-blue-300 text-blue-600"
                : "hover:border-slate-300 hover:bg-white border-transparent "
            )}
          >
            {value}
          </div>
        </PopoverTrigger>
        <PopoverContent className="text-sm p-0 min-w-[100px]">
          <div className="w-full h-full flex felx-col items-center justify-center">
            <Command>
              <CommandList className="p-1">
                <CommandItem value="filter" onSelect={select}>
                  <Filter />
                  Filter berdasarkan ini
                </CommandItem>
                <CommandItem value="new-tab" onSelect={select}>
                  <ExternalLink />
                  Buka di tab baru
                </CommandItem>
                <CommandItem value="edit" onSelect={select}>
                  <Pencil />
                  Edit data
                </CommandItem>
              </CommandList>
            </Command>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
