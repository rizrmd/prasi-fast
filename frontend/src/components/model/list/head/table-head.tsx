import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useValtioTab } from "@/hooks/use-valtio-tab";
import { useLocal } from "@/hooks/use-local";
import { FC } from "react";
import * as models from "shared/models";
import { ModelName } from "shared/types";
import { getRelation } from "../../utils/get-relation";
import { ModelTableHeadContent } from "./table-head-content";
import { ModelTableHeadTitle } from "./table-head-title";

export const ModelTableHead: FC<{
  modelName: ModelName;
  columnName: string;
  colIdx: number;
  className?: string;
  tabId: string;
}> = ({ modelName, columnName, colIdx, className, tabId }) => {
  const local = useLocal({ open: false });
  const modelTab = useValtioTab(tabId);
  const rootModel = models[modelName];
  let model = rootModel;

  let title = "...";
  let isRelation = false;
  if (columnName.includes(".")) {
    isRelation = true;
    const rel = getRelation(modelName, columnName);
    if (rel) {
      title = rel.relation.label;
      model = rel.model;
    } else {
      return null;
    }
  } else {
    title = rootModel.config.columns[columnName]?.label || columnName;
  }

  // Get current filter and sort state from the tab
  const isFiltering = modelTab.filters[columnName]?.length > 0;
  const sortDirection = modelTab.sortBy?.column === columnName ? modelTab.sortBy.direction : undefined;

  return (
    <Popover
      open={local.open}
      onOpenChange={async (open) => {
        local.open = open;
        local.render();
      }}
    >
      <PopoverTrigger asChild>
        <ModelTableHeadTitle
          title={title}
          sortBy={sortDirection}
          filterCount={isFiltering ? modelTab.filters[columnName]?.length : undefined}
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
          tabId={tabId}
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
