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
import { cn } from "@/lib/utils";
import { css } from "goober";
import { ArrowUpDown, ChevronDown, Plus } from "lucide-react";
import { FC } from "react";
import * as models from "shared/models";
import { ModelName } from "shared/types";
import { getRelation } from "../utils/get-relation";
import { Button } from "@/components/ui/button";
import { useLocal } from "@/hooks/use-local";
import get from "lodash.get";
import { useModelDetail } from "@/hooks/use-model-detail";
import { useModelTable } from "@/hooks/use-model-table";

export const ModelTableHead: FC<{
  modelName: ModelName;
  table: ReturnType<typeof useModelTable>;
  detail?: ReturnType<typeof useModelDetail>;
  columnName: string;
  colIdx: number;
  className?: string;
  rows?: any[];
}> = ({ modelName, columnName, colIdx, className, rows, detail }) => {
  const local = useLocal({ open: false });
  const rootModel = models[modelName];
  let model = rootModel;

  let title = "...";
  if (columnName.includes(".")) {
    const rel = getRelation(modelName, columnName);
    if (rel) {
      console.log(rel.model.config.columns, rel.column);
      title = rel.model.config.columns[rel.column]?.label || rel.column;
      model = rel.model;
    } else {
      return "- invalid -";
    }
  } else {
    title = rootModel.config.columns[columnName]?.label || columnName;
  }

  return (
    <Popover
      onOpenChange={(open) => {
        local.open = open;
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
                variant="outline"
                onClick={() => {
                  if (!detail) return;
                  detail.sortBy = detail.sortBy === "asc" ? "desc" : "asc";
                  detail.render();
                }}
              >
                <ArrowUpDown className={detail?.sortBy === "desc" ? "rotate-180" : ""} />
              </Button>
          </div>
          <CommandList
            className={css`
              svg {
                color: white;
              }
            `}
          >
            <CommandEmpty>Data tidak ditemukan</CommandEmpty>

            {(rows || []).map((item, idx) => {
              let base = item;
              return (
                <CommandItem
                  asChild
                  value={item[model.config.primaryKey]}
                  key={idx}
                >
                  <label>
                    <Checkbox 
                      onCheckedChange={() => {
                        if (!detail) return;
                        detail.filterBy = item[model.config.primaryKey];
                        detail.render();
                      }} 
                      checked={detail?.filterBy === item[model.config.primaryKey]}
                    />
                    <span>{get(base, columnName)}</span>
                  </label>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
