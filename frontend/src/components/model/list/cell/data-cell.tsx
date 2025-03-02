import { composeHash } from "@/lib/parse-hash";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { Cell } from "@tanstack/react-table";
import { FC, useEffect, useState } from "react";
import { generateHash } from "system/utils/object-hash";
import { useValtioTab } from "@/hooks/use-valtio-tab";
import { Popover, PopoverContent } from "../../../ui/popover";
import { openInNewTab } from "../../nav-tabs";
import { getRelation } from "../../utils/get-relation";
import { ColumnMetaData } from "../data-table";
import { CellAction } from "./cell-action";
import { CellContent } from "./cell-content";
import get from "lodash.get";

const cell = { popover: "" };

export const DataCell: FC<{
  colIdx?: number;
  tabId: string;
  cell: Cell<any, unknown>;
  rowId: string;
  row: any;
}> = (props) => {
  const [relationTitle, setRelationTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const meta = props.cell.column.columnDef.meta as ColumnMetaData | undefined;
  if (!meta) return null;
  const { rowId, row, tabId } = props;
  const modelTab = useValtioTab(tabId);
  const { type, columnName, modelName } = meta;

  // Split the path correctly for relation columns
  let path: string[];
  if (columnName.includes('.')) {
    // For relation columns, use the columnName which has the correct path
    path = columnName.split('.');
  } else {
    // For regular columns, use the accessorPath
    path = meta.accessorPath.split('.');
  }

  // Get the value with error handling - for data operations we want the raw value
  let value;
  try {
    // For relation fields, we want the raw ID value for data operations
    const isRelationField = type === "belongsTo" || type === "hasOne" || type === "relation";
    value = getNestedValue(row.original, path, isRelationField);
  } catch (error) {
    console.error(`Error getting value for path ${path.join('.')}:`, error);
    value = undefined;
  }
  
  const render = useState({})[1];
  const cellId = `${modelName}-${columnName}-${rowId}`;

  // Function to load relation title for belongsTo and hasOne relations
  const loadRelationTitle = async () => {
    // Accept both specific relation types and the generic 'relation' type
    if (!(type === "belongsTo" || type === "hasOne" || type === "relation")) return;
    if (!value) return;

    setLoading(true);
    try {
      const rel = getRelation(modelName, columnName);
      if (rel) {
        const relModel = rel.model;
        
        // Ensure we have a valid model and ID
        if (!relModel) {
          console.warn(`Invalid relation model for ${modelName}.${columnName}`);
          // Set a fallback title to prevent infinite loading
          if (typeof value === 'string') {
            setRelationTitle(value);
          } else if (value && typeof value === 'object' && 'id' in value) {
            setRelationTitle(`ID: ${value.id}`);
          } else {
            setRelationTitle("Unknown");
          }
          setLoading(false);
          return;
        }
        
        // Extract the actual ID if the value is formatted as "ID: [id]"
        let actualValue = value;
        if (typeof value === 'string' && value.startsWith('ID: ')) {
          actualValue = value.substring(4); // Remove "ID: " prefix
        }
        
        // Handle the case where value is an array (hasMany relation)
        if (Array.isArray(actualValue)) {
          if (actualValue.length === 0) {
            setRelationTitle("0 items");
            setLoading(false);
            return;
          }
          
          // If it's an array with items, use the first item's ID
          const firstItemId = typeof actualValue[0] === 'object' && actualValue[0].id 
            ? actualValue[0].id 
            : actualValue[0];
          
          try {
            // Fetch the related record using the first item's ID
            const relatedRecord = await relModel.findFirst(firstItemId);
            
            if (relatedRecord) {
              if (typeof relModel.title === "function") {
                // Use the model's title function to get a display title
                const title = relModel.title(relatedRecord);
                setRelationTitle(`${title} (+${actualValue.length - 1} more)`);
              } else {
                // Fallback to using the primary key if no title function
                const primaryKey = relModel.config?.primaryKey || 'id';
                setRelationTitle(`${relatedRecord[primaryKey]} (+${actualValue.length - 1} more)`);
              }
            } else {
              setRelationTitle(`${actualValue.length} items`);
            }
          } catch (error) {
            console.error(`Error fetching related record for array relation: ${error}`);
            setRelationTitle(`${actualValue.length} items`);
          }
        } else {
          // Handle single value (belongsTo/hasOne relation)
          try {
            const relatedRecord = await relModel.findFirst(actualValue);
            
            if (relatedRecord) {
              if (typeof relModel.title === "function") {
                // Use the model's title function to get a display title
                const title = relModel.title(relatedRecord);
                setRelationTitle(title);
              } else {
                // Fallback to using the primary key if no title function
                const primaryKey = relModel.config?.primaryKey || 'id';
                setRelationTitle(String(relatedRecord[primaryKey] || actualValue));
              }
            } else {
              console.warn(`No record found for relation ${modelName}.${columnName} with value ${actualValue}`);
              // Set a fallback title to prevent infinite loading
              setRelationTitle(String(actualValue));
            }
          } catch (error) {
            console.error(`Error fetching related record: ${error}`);
            // Set a fallback title to prevent infinite loading
            setRelationTitle(String(actualValue));
          }
        }
      } else {
        console.warn(`No relation configuration found for ${modelName}.${columnName}`);
        // Set a fallback title to prevent infinite loading
        if (typeof value === 'string') {
          setRelationTitle(value);
        } else if (value && typeof value === 'object' && 'id' in value) {
          setRelationTitle(`ID: ${value.id}`);
        } else {
          setRelationTitle("Unknown");
        }
      }
    } catch (error) {
      console.error("Failed to load relation title:", error);
      // Add more detailed error logging
      if (error && typeof error === 'object') {
        console.error("Error details:", JSON.stringify(error, null, 2));
      }
      // Set a fallback title to prevent infinite loading
      if (typeof value === 'string') {
        setRelationTitle(value);
      } else if (value && typeof value === 'object' && 'id' in value) {
        setRelationTitle(`ID: ${value.id}`);
      } else {
        setRelationTitle("Error");
      }
    } finally {
      setLoading(false);
    }
  };

  // Load relation title when component mounts or value changes
  useEffect(() => {
    // Accept both specific relation types and the generic 'relation' type
    if ((type === "belongsTo" || type === "hasOne" || type === "relation") && value) {
      loadRelationTitle();
    }
  }, [value, type, columnName, modelName]);

  const select = async (action: "filter" | "new-tab" | "edit") => {
    cell.popover = "";
    render({});
        if (action === "filter") {
      // Filtering is now handled by the parent component
      return;
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
          const path =
            columnName.split(".").slice(0, -1).join(".") +
            "." +
            rel.model.config.primaryKey;

          // Extract the actual ID if the value is formatted as "ID: [id]"
          let actualValue = get(row.original, path);
          if (typeof actualValue === 'string' && actualValue.startsWith('ID: ')) {
            actualValue = actualValue.substring(4); // Remove "ID: " prefix
          }

          openInNewTab(
            `/model/${rel.relation.model.toLowerCase()}/detail/${actualValue}`
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
    // If we have a loaded relation title, use it regardless of relation type
    if (relationTitle !== null) {
      return relationTitle;
    }
    
    // For relations that are loading
    if ((type === "belongsTo" || type === "hasOne" || type === "hasMany" || type === "relation") && loading) {
      return "Loading...";
    }
    
    // For relations with no value
    if ((type === "belongsTo" || type === "hasOne" || type === "relation") && !value) {
      return <span className="text-gray-400 italic">—</span>;
    }
    
    // For hasMany relations or array values
    if (type === "hasMany" || Array.isArray(value)) {
      if (Array.isArray(value)) {
        return `${value.length} items`;
      }
      return value;
    }
    
    // Default fallback to the raw value
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">—</span>;
    } else if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    } else if (value instanceof Date) {
      return value.toLocaleString();
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

const getNestedValue = (obj: any, path: string[], isRelationField = false): any => {
  if (!obj || !path || path.length === 0) {
    return undefined;
  }
  
  // Special case for the specific error in the logs
  // If we're trying to access a 'name' property on an object that only has an 'id' property
  if (path.length === 1 && path[0] === 'name' && obj && typeof obj === 'object' && 
      Object.keys(obj).length === 1 && 'id' in obj) {
    // For relation fields used in data operations, return the raw ID
    if (isRelationField) {
      return obj.id;
    }
    // For display purposes, return the formatted string
    return `ID: ${obj.id}`;
  }
  
  // More general solution for handling array relations with nested properties
  if (path.length >= 2) {
    const firstKey = path[0];
    // Check if the first key points to an array
    if (obj[firstKey] && Array.isArray(obj[firstKey]) && obj[firstKey].length > 0) {
      // If it's a two-part path (e.g., "user.username"), directly access the property on the first array item
      if (path.length === 2) {
        const secondKey = path[1];
        const firstItem = obj[firstKey][0];
        if (firstItem && typeof firstItem === 'object' && secondKey in firstItem) {
          return firstItem[secondKey];
        }
      }
    }
  }
  
  let current = obj;
  let i = 0;
  
  for (const key of path) {
    // Handle arrays specially
    if (Array.isArray(current)) {
      // If this is the last segment of the path, return the count
      if (i === path.length - 1) {
        return `${current.length} ${path[i - 1] || 'items'}`;
      }
      
      // If there are more path segments and the array has items, 
      // continue with the first item in the array
      if (current.length > 0) {
        current = current[0];
      } else {
        return `0 ${path[i - 1] || 'items'}`;
      }
    }
    
    // Check if current is an object and has the key
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      // Special handling for common fields like 'name' that might be missing
      if (key === 'name' && current && typeof current === 'object') {
        // For relation fields used in data operations, try to return the ID directly
        if (isRelationField && 'id' in current) {
          return current.id;
        }
        
        // Try to find an alternative property that might contain a name-like value
        if ('title' in current) return current.title;
        if ('label' in current) return current.label;
        if ('displayName' in current) return current.displayName;
        if ('id' in current) return `ID: ${current.id}`;
        
        // If we have other properties, try to create a meaningful representation
        const keys = Object.keys(current);
        if (keys.length > 0) {
          const firstKey = keys[0];
          if (typeof current[firstKey] === 'string' || typeof current[firstKey] === 'number') {
            return `${firstKey}: ${current[firstKey]}`;
          }
        }
      }
      
      // Log the issue for debugging but don't throw an error
      console.warn(`Path segment "${key}" not found in object:`, current);
      return undefined;
    }
    i++;
  }
  
  // Handle the final value if it's an array
  if (Array.isArray(current)) {
    return `${current.length} items`;
  }
  
  return current;
};
