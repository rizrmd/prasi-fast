import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useModelTable } from "@/hooks/model-table/use-model-table";
import { useLocal } from "@/hooks/use-local";
import { cn } from "@/lib/utils";
import { css } from "goober";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from "lucide-react";
import { FC } from "react";
import * as models from "shared/models";
import { ModelName } from "shared/types";
import { getRelation } from "../utils/get-relation";

export const ModelTableHead: FC<{
  modelName: ModelName;
  tableModel: ReturnType<typeof useModelTable>;
  columnName: string;
  colIdx: number;
  className?: string;
}> = ({ modelName, columnName, colIdx, className, tableModel }) => {
  const local = useLocal({ open: false });
  const rootModel = models[modelName];
  let model = rootModel;

  let title = "...";
  if (columnName.includes(".")) {
    const rel = getRelation(modelName, columnName);
    if (rel) {
      title = rel.model.config.columns[rel.column]?.label || rel.column;
      model = rel.model;
    } else {
      return "- invalid -";
    }
  } else {
    title = rootModel.config.columns[columnName]?.label || columnName;
  }

  const sortBy = tableModel?.sortBy[columnName];
  return (
    <Popover
      onOpenChange={async (open) => {
        local.open = open;
        if (open && tableModel) {
          await tableModel.fetchUniqueValues(columnName);
        }
        local.render();
      }}
    >
      <PopoverTrigger asChild>
        <div
          className={cn(
            "w-full h-full flex px-2 min-h-[40px] items-center border-r border-transparent cursor-pointer transition-all relative justify-between group",
            className,
            colIdx === 0 && "rounded-tl-md",
            colIdx > 0 && "border-l",
            local.open
              ? "border-gray-200 bg-blue-100 outline-primary"
              : "hover:border-gray-200 hover:bg-blue-50"
          )}
        >
          <div>{title}</div>
          <ChevronDown
            className={cn(
              "chevron  transition-all absolute right-2 group-hover:opacity-60",
              local.open ? "opacity-60" : "opacity-0"
            )}
            size={20}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="text-sm p-0 min-w-[250px]">
        <Command>
          <div
            className={cn(
              "flex items-stretch border-b",
              css`
                .button {
                  min-height: 0;
                  padding: 0px 6px;
                  height: 24px;
                  border-radius: 5px;
                  cursor: pointer;
                  margin: 5px 0px;
                }
                div[data-slot="command-input-wrapper"] {
                  border: 0;
                }
              `
            )}
          >
            <CommandInput
              className="flex-1 px-0"
              placeholder={`Filter ${title}...`}
            />
            <Button
              size={"icon"}
              variant={sortBy ? "default" : "outline"}
              onClick={async () => {
                if (!tableModel) return;
                if (sortBy) {
                  if (sortBy === "asc") {
                    tableModel.sortBy = { [columnName]: "desc" };
                  } else {
                    tableModel.sortBy = {};
                  }
                } else {
                  tableModel.sortBy = { [columnName]: "asc" };
                }
                await tableModel.fetchData({ filtering: true });
              }}
            >
              {sortBy ? (
                <>{sortBy === "asc" ? <ArrowUp /> : <ArrowDown />}</>
              ) : (
                <ArrowUpDown />
              )}
            </Button>
          </div>
          <CommandList
            className={css`
              svg {
                color: white;
              }
            `}
          >
            {tableModel?.loadingUniqueValues[columnName] ? (
              <div className="flex items-center justify-center py-4">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="ml-2">Loading...</span>
              </div>
            ) : (
              <>
                <CommandEmpty>Data tidak ditemukan</CommandEmpty>

                {(Array.isArray(tableModel?.uniqueValues[columnName])
                  ? tableModel.uniqueValues[columnName]
                  : []
                ).map((item: any, idx: number) => {
                  return (
                    <CommandItem asChild value={String(item)} key={idx}>
                      <label>
                        <Checkbox
                          onCheckedChange={async (checked) => {
                            if (!tableModel) return;

                            const newFilterBy = { ...tableModel.filterBy };
                            
                            if (!newFilterBy[columnName]) {
                              newFilterBy[columnName] = [];
                            }

                            if (checked) {
                              if (!newFilterBy[columnName].includes(item)) {
                                newFilterBy[columnName] = [...newFilterBy[columnName], item];
                              }
                            } else {
                              newFilterBy[columnName] = newFilterBy[columnName].filter((v) => v !== item);
                              if (newFilterBy[columnName].length === 0) {
                                delete newFilterBy[columnName];
                              }
                            }

                            tableModel.filtering = true;
                            tableModel.filterBy = newFilterBy;
                            tableModel.render();
                          }}
                          checked={
                            !!tableModel?.filterBy[columnName]?.includes(item)
                          }
                        />
                        <span>{String(item)}</span>
                      </label>
                    </CommandItem>
                  );
                })}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
