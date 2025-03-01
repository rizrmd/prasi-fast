import { FC, useCallback, useEffect, useState } from "react";
import { ModelName, Models } from "shared/types";
import { FormWriter } from "../../types";
import { Column } from "system/model/layout/types";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const isColumnWithCol = (
  field: Column<ModelName>
): field is { col: string } => {
  return "col" in field && typeof field.col === "string";
};

export const FieldRelation: FC<{
  model: Models[keyof Models];
  field: Column<ModelName>;
  writer: FormWriter;
  onChange: (arg: { value: any; col: string }) => void;
}> = ({ model, field, writer, onChange }) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [items, setItems] = useState<
    ReturnType<typeof model.findMany> extends Promise<infer T> ? T : never
  >([]);
  const [loading, setLoading] = useState(true);

  // Get column name safely
  const columnName = isColumnWithCol(field) ? field.col : "";

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const select: any = { id: true }; // Always include id
      if (Array.isArray(model.titleColumns) && model.titleColumns.length > 0) {
        model.titleColumns.forEach((e) => {
          select[e] = true;
        });
      } else {
        console.warn("No titleColumns defined for model:", model);
      }
      const data = await model.findMany({
        select,
      });

      // Ensure data is an array before setting items
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        console.error("Invalid data format received from model.findMany");
        setItems([]);
      }
    } catch (error) {
      console.error("Failed to load relation items:", error);
    }
    setLoading(false);
  }, [model]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Early return if no column name
  if (!columnName) {
    console.error("Invalid field configuration for FieldRelation");
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value && typeof model.title === "function"
            ? model.title(items.find((item) => item.id === value) || {}) ||
              `Select ${columnName}`
            : `Select ${columnName}`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={`Search ${columnName}...`} />
          {loading && <CommandEmpty>Loading...</CommandEmpty>}
          {!loading && items.length === 0 && (
            <CommandEmpty>No {columnName} found.</CommandEmpty>
          )}
          <CommandList>
            {Array.isArray(items) &&
              items.map((item) => {
                const label =
                  typeof model.title === "function"
                    ? model.title(item) || item.id
                    : item.id;
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => {
                      setValue(item.id);
                      onChange({ value: item.id, col: columnName });
                      setOpen(false);
                    }}
                    value={label}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {label}
                  </CommandItem>
                );
              })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
