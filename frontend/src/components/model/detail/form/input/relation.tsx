import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { FC, useCallback, useEffect, useState } from "react";
import { ModelName, Models } from "shared/types";
import { Column } from "system/model/layout/types";
import set from "lodash.set";
import { FormWriter } from "../../types";
import { useReader } from "@/hooks/use-read-write";
import get from "lodash.get";
import { Spinner } from "@/components/ui/spinner";

const isColumnWithCol = (
  field: Column<ModelName>
): field is { col: string } => {
  return "col" in field && typeof field.col === "string";
};

// Function to get the model and path from a field
const getModelAndPath = (field: Column<ModelName>, rootModel: Models[ModelName]) => {
  if (!("col" in field) || !field.col) {
    throw new Error("Invalid field configuration");
  }

  const parts = field.col.split(".");
  let currentPath = "";
  let currentModel = rootModel;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (currentPath) {
      currentPath += ".";
    }
    currentPath += part;

    // If this is not the last part and it references a relation
    if (i < parts.length - 1) {
      const relationField = (currentModel as any)[part];
      if (!relationField || !relationField.config?.modelName) {
        throw new Error(`Invalid relation path: ${currentPath}`);
      }
      currentModel = relationField;
    }
  }

  return {
    model: currentModel,
    path: field.col
  };
};

export const FieldRelation: FC<{
  rootModel: Models[keyof Models];
  label: string;
  field: Column<ModelName>;
  writer: FormWriter;
  onChange: (arg: { value: any; col: string }) => void;
}> = ({ rootModel, field, label, onChange, writer }) => {
  const form = useReader(writer);
  const [open, setOpen] = useState(false);
  let [value, setValue] = useState("");

  // Get column name safely
  const columnName = isColumnWithCol(field) ? field.col : "";
  const { model, path } = getModelAndPath(field, rootModel);
  const subPath = path.split(".").slice(0, -1).join(".");
  const propValue = get(form.data, `${subPath}.${model.config.primaryKey}`);
  if (value === "" && propValue) {
    value = propValue;
  }

  useEffect(() => {
    if (value !== propValue) {
      setValue(propValue);
    }
  }, [propValue]);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          className="w-full justify-between cursor-pointer"
        >
          {items.length === 0 ? (
            <Spinner />
          ) : (
            <>
              {value && typeof model.title === "function"
                ? model.title(items.find((item) => item.id === value) || {}) ||
                  `Pilih ${label}`
                : `Pilih ${label}`}
            </>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={`Cari ${label}...`} />
          {loading && <CommandEmpty>Loading...</CommandEmpty>}
          {!loading && items.length === 0 && (
            <CommandEmpty>{label} tidak ditemukan.</CommandEmpty>
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

                      const parts = path.split(".");
                      parts.pop();
                      set(writer.data, parts.join("."), {
                        [model.config.primaryKey]: item.id,
                      });

                      writer.unsaved = true;
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
