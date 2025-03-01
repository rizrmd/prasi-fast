import { useModelList } from "@/hooks/model-list/use-model-list";
import { composeHash } from "@/lib/parse-hash";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { FC, useEffect, useState } from "react";
import { ModelName } from "shared/types";
import { generateHash } from "system/utils/object-hash";
import { Popover, PopoverContent } from "../../../ui/popover";
import { openInNewTab } from "../../nav-tabs";
import { getRelation } from "../../utils/get-relation";
import { CellAction } from "./cell-action";
import { CellContent } from "./cell-content";
import * as models from "shared/models";
import { Cell } from "@tanstack/react-table";
import { ColumnMetaData } from "../data-table";

const cell = { popover: "" };

export const DataCell: FC<{
  colIdx?: number;
  modelTable: ReturnType<typeof useModelList>;
  cell: Cell<any, unknown>;
  rowId: string;
  row: any;
}> = (props) => {
  const [relationTitle, setRelationTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const meta = props.cell.column.columnDef.meta as ColumnMetaData | undefined;
  if (!meta) return null;
  const { rowId, row, modelTable } = props;
  const { type, columnName, modelName } = meta;
  const path = meta.accessorPath.split(".");
  const value = getNestedValue(row.original, path);
  const render = useState({})[1];
  const cellId = `${modelName}-${columnName}-${rowId}`;

  // Function to load relation title for belongsTo and hasOne relations
  const loadRelationTitle = async () => {
    if (type !== "belongsTo" && type !== "hasOne") return;
    if (!value) return;

    setLoading(true);
    try {
      const rel = getRelation(modelName, columnName);
      if (rel) {
        const relModel = rel.model;
        // Fetch the related record
        const relatedRecord = await relModel.findFirst(value);
        if (relatedRecord && typeof relModel.title === "function") {
          // Use the model's title function to get a display title
          const title = relModel.title(relatedRecord);
          setRelationTitle(title);
        }
      }
    } catch (error) {
      console.error("Failed to load relation title:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load relation title when component mounts or value changes
  useEffect(() => {
    if ((type === "belongsTo" || type === "hasOne") && value) {
      loadRelationTitle();
    }
  }, [value, type, columnName, modelName]);

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
      } else if ((type === "belongsTo" || type === "hasOne") && value) {
        // For belongsTo and hasOne relations, navigate to the related record
        const rel = getRelation(modelName, columnName);
        if (rel) {
          openInNewTab(
            `/model/${rel.relation.model.toLowerCase()}/detail/${value}`
          );
          cell.popover = "";
          render({});
          return;
        }
      }
      openInNewTab(`/model/${modelName.toLowerCase()}/detail/${rowId}`);
    }
  };

  // Determine the display value based on relation type
  const displayValue = (() => {
    if (type === "hasMany") {
      return value;
    } else if (
      (type === "belongsTo" || type === "hasOne") &&
      relationTitle !== null
    ) {
      return relationTitle;
    } else {
      return value;
    }
  })();

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
            value={displayValue}
            isActive={cell.popover === cellId}
            loading={loading}
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

const getNestedValue = (obj: any, path: string[]): any => {
  let current = obj;
  for (const key of path) {
    if (Array.isArray(current)) {
      // If current is an array, take first element
      current = current[0];
    }
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  // Handle final value being an array
  if (Array.isArray(current)) {
    current = current[0];
  }
  return current;
};
