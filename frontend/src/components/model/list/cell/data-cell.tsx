import { useModelList } from "@/hooks/model-list/use-model-list";
import { composeHash } from "@/lib/parse-hash";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { FC, useState } from "react";
import { ModelName } from "shared/types";
import { generateHash } from "system/utils/object-hash";
import { Popover, PopoverContent } from "../../../ui/popover";
import { openInNewTab } from "../../nav-tabs";
import { getRelation } from "../../utils/get-relation";
import { CellAction } from "./cell-action";
import { CellContent } from "./cell-content";

const cell = { popover: "" };

export const DataCell: FC<{
  modelTable: ReturnType<typeof useModelList>;
  modelName: ModelName;
  columnName: string;
  type: string;
  value?: any;
  rowId: string;
  colIdx?: number;
}> = (props) => {
  const { value, modelName, columnName, rowId, colIdx, type, modelTable } =
    props;
  const render = useState({})[1];
  const cellId = `${modelName}-${columnName}-${rowId}-${colIdx}`;
  const select = async (action: "filter" | "new-tab" | "edit") => {
    cell.popover = "";
    render({});
    if (action === "filter") {
      const rel = getRelation(modelName, columnName);
      if (type === "hasMany" && rel) {
      } else {
        if (!modelTable) return;

        const newFilterBy = { ...modelTable.filterBy };

        if (!newFilterBy[columnName]) {
          newFilterBy[columnName] = [];
        }

        if (!newFilterBy[columnName].includes(value)) {
          newFilterBy[columnName] = [...newFilterBy[columnName], value];
        }

        modelTable.filtering = true;
        modelTable.filterBy = newFilterBy;
        modelTable.render();
      }
    }
    if (action === "new-tab") {
      if (type === "hasMany") {
        const rel = getRelation(modelName, columnName);
        if (rel) {
          const hash = await generateHash({
            parent: { modelName, columnName, rowId, type: "hasMany" },
          });
          openInNewTab(
            `/model/${rel.relation.model.toLowerCase()}${composeHash({
              parent: hash,
            })}`
          );
        }

        cell.popover = "";
        render({});
        return;
      }
      openInNewTab(`/model/${modelName.toLowerCase()}/detail/${rowId}`);
    }
  };

  return (
    <div className="flex flex-1">
      <Popover
        onOpenChange={(open) => {
          if (!open) {
            cell.popover = "";
            render({});
          }
        }}
        open={cell.popover === cellId}
      >
        <PopoverTrigger
          onClick={(e) => {
            e.stopPropagation();
            cell.popover = cellId;
            render({});
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            cell.popover = cellId;
            render({});
          }}
        >
          <CellContent
            type={type}
            value={value}
            isActive={cell.popover === cellId}
          />
        </PopoverTrigger>
        <PopoverContent className="text-sm p-0 min-w-[100px]">
          <div className="w-full h-full flex felx-col items-center justify-center">
            <CellAction
              select={select as any}
              modelName={modelName}
              columnName={columnName}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
