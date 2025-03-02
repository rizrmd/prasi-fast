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
import { FC, useEffect, useState } from "react";
import { ModelName } from "shared/types";
import { SimpleTooltip } from "@/components/ext/simple-tooltip";
import { ModelTableHeadLoading } from "./table-head-loading";
import { useValtioTab } from "@/hooks/use-valtio-tab";

interface ModelTableHeadContentProps {
  modelName: ModelName;
  columnName: string;
  title: string;
  tabId: string;
  onClose?: () => void;
  isRelation: boolean;
}

export const ModelTableHeadContent: FC<ModelTableHeadContentProps> = ({
  columnName,
  title,
  tabId,
  onClose,
  isRelation,
}) => {
  const tab = useValtioTab(tabId);
  const [filterSearch, setFilterSearch] = useState("");
  
  // Get current filter, sort, and unique values state from the tab
  const filterValues = tab.filters[columnName] || [];
  const sortDirection = tab.sortBy?.column === columnName ? tab.sortBy.direction : undefined;
  const uniqueValues = tab.uniqueValues[columnName] || [];
  const isLoadingUniqueValues = tab.loadingUniqueValues[columnName] || false;
  
  // Load unique values when component mounts or when tabId changes
  useEffect(() => {
    if (!isLoadingUniqueValues && !uniqueValues.length) {
      tab.op.loadUniqueValues(columnName);
    }
  }, [columnName, tabId]);

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

  // Handle filter changes
  const handleFilterChange = (item: any, checked: boolean) => {
    let newFilterValues = [...filterValues];
    
    if (checked) {
      // Add to filter if not already included
      if (!newFilterValues.includes(item)) {
        newFilterValues.push(item);
      }
    } else {
      // Remove from filter
      newFilterValues = newFilterValues.filter(val => val !== item);
    }
    
    // Update filters in the tab
    tab.op.setFilter(columnName, newFilterValues);
    onClose?.();
  };
  
  // Handle clearing filters
  const handleClearFilter = () => {
    tab.op.clearFilter(columnName);
    onClose?.();
  };
  
  // Handle sorting
  const handleSort = () => {
    tab.op.toggleSorting(columnName);
    onClose?.();
  };

  return (
    <Command>
      <div className={cn("flex items-stretch border-b pr-[5px]", styles)}>
        <CommandInput
          className="flex-1 px-0"
          placeholder={`Filter ${title}...`}
          value={filterSearch}
          onValueChange={setFilterSearch}
        />

        {filterValues.length > 0 && (
          <SimpleTooltip content="Bersihkan Filter">
            <Button
              size="icon"
              variant="outline"
              className={cn("border-r-0", clearButtonStyles)}
              onClick={handleClearFilter}
            >
              <Eraser />
            </Button>
          </SimpleTooltip>
        )}

        <SimpleTooltip content="Urutkan berdasarkan kolom ini">
          <Button
            size="icon"
            variant={sortDirection ? "default" : "outline"}
            onClick={handleSort}
            className={cn(filterValues.length > 0 && sortButtonStyles)}
          >
            {sortDirection ? (
              <>{sortDirection === "asc" ? <ArrowUp /> : <ArrowDown />}</>
            ) : (
              <ArrowUpDown />
            )}
          </Button>
        </SimpleTooltip>
      </div>
      <CommandList className={svgStyles}>
        {isLoadingUniqueValues ? (
          <ModelTableHeadLoading />
        ) : (
          <>
            <CommandEmpty>Data tidak ditemukan</CommandEmpty>

            {uniqueValues
              .filter(item => 
                filterSearch === "" || 
                String(item).toLowerCase().includes(filterSearch.toLowerCase())
              )
              .map((item: any, idx: number) => {
                return (
                  <CommandItem asChild value={String(item)} key={idx}>
                    <label
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Checkbox
                        onCheckedChange={(checked) => {
                          handleFilterChange(item, !!checked);
                        }}
                        checked={filterValues.includes(item)}
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
