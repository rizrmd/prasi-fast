import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useModelList } from "@/hooks/model-list/use-model-list";
import { useLocal } from "@/hooks/use-local";
import { FC } from "react";
import * as models from "shared/models";
import { ModelName } from "shared/types";
import { getRelation } from "../../utils/get-relation";
import { ModelTableHeadContent } from "./table-head-content";
import { ModelTableHeadTitle } from "./table-head-title";

export const ModelTableHead: FC<{
  modelName: ModelName;
  tableModel: ReturnType<typeof useModelList>;
  columnName: string;
  colIdx: number;
  className?: string;
}> = ({ modelName, columnName, colIdx, className, tableModel }) => {
  const local = useLocal({ open: false });
  const rootModel = models[modelName];
  let model = rootModel;

  let title = "...";
  let isRelation = false;
  if (columnName.includes(".")) {
    isRelation = true;
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

  const isFiltering =
    tableModel?.filterBy[columnName] &&
    tableModel?.filterBy[columnName].length > 0;

  const sortDirection = tableModel?.sortBy[columnName];

  return (
    <Popover
      open={local.open}
      onOpenChange={async (open) => {
        local.open = open;
        if (open && tableModel) {
          await tableModel.fetchUniqueValues(columnName);
        }
        local.render();
      }}
    >
      <PopoverTrigger asChild>
        <ModelTableHeadTitle
          title={title}
          sortBy={sortDirection}
          filterCount={
            isFiltering ? tableModel?.filterBy[columnName].length : undefined
          }
          isOpen={local.open}
          colIdx={colIdx}
          className={className}
          onClick={() => {
            local.open = true;
          }}
        />
      </PopoverTrigger>
      <PopoverContent className="text-sm p-0 min-w-[250px]">
        <ModelTableHeadContent
          modelName={modelName}
          columnName={columnName}
          title={title}
          modelTable={tableModel}
          onClose={() => {
            local.open = false;
            local.render();
          }}
          isRelation={isRelation}
        />
      </PopoverContent>
    </Popover>
  );
};
