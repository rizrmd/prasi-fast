import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { ArrowRight, ExternalLink, Filter, Pencil } from "lucide-react";
import { FC, Fragment, useState } from "react";
import * as models from "shared/models";
import { ModelName } from "shared/types";
import { Popover, PopoverContent } from "../ui/popover";
import { openInNewTab } from "../model/nav-tabs";

const cell = { popover: "" };

export const DataCell: FC<{
  modelName: ModelName;
  columnName: string;
  type: string;
  value?: any;
  rowId: string;
  colIdx?: number;
}> = (props) => {
  const { value, modelName, columnName, rowId, colIdx, type } = props;
  const render = useState({})[1];
  const cellId = `${modelName}-${columnName}-${rowId}-${colIdx}`;

  const select = (action: string) => {
    if (action === "new-tab") {
      if (type === "hasMany") {
        const model = models[modelName];
        const parts = columnName.split(".");

        const rel = model.config.relations[parts[0]];

        const relModel = models[rel.model];
        if (relModel) {
          const col = relModel.config.columns[parts[1]];

          if (col) {
            for (const [k, v] of Object.entries(relModel.config.relations)) {
              if (v.model === modelName) {
                openInNewTab(
                  `/model/${rel.model.toLowerCase()}#filter#${
                    v.prismaField
                  }=${rowId}`
                );
              }
            }
          }
        }

        cell.popover = "";
        render({});
        return;
      }
      openInNewTab(`/model/${modelName.toLowerCase()}/detail/${rowId}`);
    }

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
          onClick={(e) => {
            e.stopPropagation();
            cell.popover = cell.popover === cellId ? "" : cellId;
            render({});
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            cell.popover = cellId;
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
            {type === "hasMany" ? (
              <>{Array.isArray(value) ? value?.length : "0 items"}</>
            ) : (
              value
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="text-sm p-0 min-w-[100px]">
          <div className="w-full h-full flex felx-col items-center justify-center">
            <CellAction
              select={select}
              modelName={modelName}
              columnName={columnName}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const CellAction: FC<{
  select: (value: string) => void;
  modelName: ModelName;
  columnName: string;
}> = ({ select, columnName, modelName }) => {
  const model = models[modelName];
  const parts = columnName.split(".");
  let lastModel = null as typeof model | null;
  return (
    <Command
      onClick={(e) => {
        e.stopPropagation();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      <CommandList>
        <CommandGroup
          heading={
            <div className="flex items-center space-x-1">
              <div>{modelName}</div>
              {parts.length > 1 ? (
                <>
                  {parts.map((e, idx) => {
                    let label = e;

                    if (idx === parts.length - 1 && lastModel) {
                      label = lastModel?.config.columns[e]?.label || label;
                    } else {
                      if (idx === 0) {
                        const rel = model.config.relations[e];
                        if (rel) {
                          label = rel.label || label;
                          lastModel = models[rel.model];
                        }
                      } else if (lastModel) {
                        const rel = lastModel?.config.relations[e];
                        if (rel) {
                          label = rel.label || label;
                          lastModel = (lastModel as any)[rel.model];
                        }
                      }
                    }
                    return (
                      <Fragment key={idx}>
                        {idx < parts.length - 1 ? (
                          <ArrowRight size={12} />
                        ) : (
                          <>{idx > 0 && <>&bull;&nbsp;</>} </>
                        )}
                        <div>{label}</div>
                      </Fragment>
                    );
                  })}
                </>
              ) : (
                <>&nbsp;&bull; {model.config.columns[columnName].label}</>
              )}
            </div>
          }
        >
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
        </CommandGroup>
      </CommandList>
    </Command>
  );
};
