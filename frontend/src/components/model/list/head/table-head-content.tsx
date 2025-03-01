import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { css } from "goober";
import { ArrowDown, ArrowUp, ArrowUpDown, Eraser } from "lucide-react";
import { FC } from "react";
import { ModelName } from "shared/types";
import { SimpleTooltip } from "@/components/ext/simple-tooltip";
import { useModelList } from "@/hooks/model-list/use-model-list";
import { ModelTableHeadLoading } from "./table-head-loading";

interface ModelTableHeadContentProps {
  modelName: ModelName;
  columnName: string;
  title: string;
  modelTable: ReturnType<typeof useModelList>;
  onClose?: () => void;
  isRelation: boolean;
}

export const ModelTableHeadContent: FC<ModelTableHeadContentProps> = ({
  columnName,
  title,
  modelTable,
  onClose,
  isRelation,
}) => {
  const sortBy = modelTable?.sortBy[columnName];

  if (isRelation) {
    return (
      <Command>
        <CommandList className={cn()}>
          <CommandItem className="flex items-center justify-center">
            Tidak ada aksi untuk kolom ini.
          </CommandItem>
        </CommandList>
      </Command>
    );
  }

  const styles = css`
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
      flex: 1;
    }
  `;

  const clearButtonStyles = css`
    border-top-right-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
  `;

  const sortButtonStyles = css`
    border-top-left-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
  `;

  const svgStyles = css`
    svg {
      color: white;
    }
  `;

  return (
    <Command>
      <div className={cn("flex items-stretch border-b pr-[5px]", styles)}>
        <CommandInput
          className="flex-1 px-0"
          placeholder={`Filter ${title}...`}
        />

        {modelTable?.filterBy[columnName]?.length > 0 && (
          <SimpleTooltip content="Bersihkan Filter">
            <Button
              size="icon"
              variant="outline"
              className={cn("border-r-0", clearButtonStyles)}
              onClick={async () => {
                if (!modelTable) return;
                delete modelTable.filterBy[columnName];
                await modelTable.fetchData({ filtering: true });
                onClose?.();
              }}
            >
              <Eraser />
            </Button>
          </SimpleTooltip>
        )}

        <SimpleTooltip content="Urutkan berdasarkan kolom ini">
          <Button
            size="icon"
            variant={sortBy ? "default" : "outline"}
            onClick={async () => {
              if (!modelTable) return;
              if (sortBy) {
                if (sortBy === "asc") {
                  modelTable.sortBy = { [columnName]: "desc" };
                } else {
                  modelTable.sortBy = {};
                }
              } else {
                modelTable.sortBy = { [columnName]: "asc" };
              }
              await modelTable.fetchData({ filtering: true });
            }}
            className={cn(
              modelTable?.filterBy[columnName]?.length > 0 && sortButtonStyles
            )}
          >
            {sortBy ? (
              <>{sortBy === "asc" ? <ArrowUp /> : <ArrowDown />}</>
            ) : (
              <ArrowUpDown />
            )}
          </Button>
        </SimpleTooltip>
      </div>
      <CommandList className={svgStyles}>
        {modelTable?.loadingUniqueValues[columnName] ? (
          <ModelTableHeadLoading />
        ) : (
          <>
            <CommandEmpty>Data tidak ditemukan</CommandEmpty>

            {(Array.isArray(modelTable?.uniqueValues[columnName])
              ? modelTable.uniqueValues[columnName]
              : []
            ).map((item: any, idx: number) => {
              return (
                <CommandItem asChild value={String(item)} key={idx}>
                  <label>
                    <Checkbox
                      onCheckedChange={async (checked) => {
                        if (!modelTable) return;

                        const newFilterBy = { ...modelTable.filterBy };

                        if (!newFilterBy[columnName]) {
                          newFilterBy[columnName] = [];
                        }

                        if (checked) {
                          if (!newFilterBy[columnName].includes(item)) {
                            newFilterBy[columnName] = [
                              ...newFilterBy[columnName],
                              item,
                            ];
                          }
                        } else {
                          newFilterBy[columnName] = newFilterBy[
                            columnName
                          ].filter((v) => v !== item);
                          if (newFilterBy[columnName].length === 0) {
                            delete newFilterBy[columnName];
                          }
                        }

                        modelTable.filtering = true;
                        modelTable.filterBy = newFilterBy;
                        modelTable.render();
                      }}
                      checked={
                        !!modelTable?.filterBy[columnName]?.includes(item)
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
  );
};
