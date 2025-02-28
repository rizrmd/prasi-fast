import { FC, useState } from "react";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { ModelName } from "shared/types";
import { openInNewTab } from "../../nav-tabs";
import { Popover, PopoverContent } from "../../../ui/popover";
import { getRelation } from "../../utils/get-relation";
import { CellAction } from "./cell-action";
import { CellContent } from "./cell-content";
import { navigate } from "@/lib/router";
import { useModelTable } from "@/hooks/model-table/use-model-table";

const cell = { popover: "" };

export const DataCell: FC<{
  modelTable: ReturnType<typeof useModelTable>;
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

  const select = (action: "filter" | "new-tab" | "edit") => {
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
          openInNewTab(
            `/model/${rel.relation.model.toLowerCase()}#filter#${
              rel.relation.prismaField
            }=${rowId}`
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
