import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ArrowRight, ExternalLink, Filter, Pencil } from "lucide-react";
import { FC, Fragment } from "react";
import * as models from "shared/models";
import { ModelName } from "shared/types";

export const CellAction: FC<{
  select: (value: string) => void;
  modelName: ModelName;
  columnName: string;
}> = ({ select, columnName, modelName }) => {
  const model = models[modelName];
  const parts = columnName.split(".");
  const isRelation = columnName.includes(".");
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
          {!isRelation && (
            <CommandItem value="filter" onSelect={select}>
              <Filter />
              Filter berdasarkan ini
            </CommandItem>
          )}
          <CommandItem value="new-tab" onSelect={select}>
            <ExternalLink />
            Buka di tab baru
          </CommandItem>
          {!isRelation && (
            <CommandItem value="edit" onSelect={select}>
              <Pencil />
              Edit data
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </Command>
  );
};
