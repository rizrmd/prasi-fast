import { SimpleTooltip } from "@/components/ext/simple-tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { useValtio } from "@/hooks/use-valtio";
import { cn } from "@/lib/utils";
import { css } from "goober";
import { ChevronLeft, ChevronRight, Copy, Save, Trash } from "lucide-react";
import { FC, useEffect } from "react";
import { ModelName, Models } from "shared/types";
import { Fields } from "system/model/layout/types";

export const DetailForm: FC<{
  model: Models[keyof Models];
  fields: Fields<ModelName>;
  data: any;
}> = ({ model, fields, data }) => {
  if (!fields) return null;
  const form = useValtio({ data });

  useEffect(() => {
    form.set((write) => {
      write.data = data;
    });
  }, [data]);

  return (
    <div className={cn("flex flex-col items-stretch flex-1 -mt-3")}>
      <div
        className={cn(
          "rounded-md border border-sidebar-border h-[40px] bg-sidebar mb-2 flex items-stretch p-[5px] rounded-t-none border-t-0 justify-between",
          css`
            button {
              height: auto;
              min-height: 0;
              padding: 0px 6px;
            }
          `
        )}
      >
        <div className="flex items-stretch space-x-1">
          <SimpleTooltip content="Data sebelumnya">
            <Button
              size="sm"
              variant={"outline"}
              disabled
              className={cn("text-xs rounded-sm cursor-pointer")}
            >
              <ChevronLeft />
            </Button>
          </SimpleTooltip>
          <SimpleTooltip content="Data selanjutnya">
            <Button
              size="sm"
              variant={"outline"}
              disabled
              className={cn("text-xs rounded-sm cursor-pointer")}
            >
              <ChevronRight />
            </Button>
          </SimpleTooltip>
          <SimpleTooltip content="Duplikat data ini">
            <Button
              size="sm"
              variant={"outline"}
              className={cn("text-xs rounded-sm cursor-pointer")}
            >
              <Copy strokeWidth={1.5} />
            </Button>
          </SimpleTooltip>
        </div>
        <div className="flex items-stretch space-x-1">
          <SimpleTooltip content="Hapus data ini">
            <Button
              size="icon"
              variant={"outline"}
              className={cn(
                "text-xs rounded-sm cursor-pointer text-red-400  border-red-100 hover:border-red-300 hover:text-red-500 transition-all"
              )}
            >
              <Trash strokeWidth={1.5} />
            </Button>
          </SimpleTooltip>
          <Button size="sm" className={cn("text-xs rounded-sm cursor-pointer")}>
            <Save /> Simpan
          </Button>
        </div>
      </div>
      <div className="flex flex-1 relative flex-col items-stretch">
        <RecursiveFields
          model={model}
          fields={fields}
          data={form.data}
          onChange={({ col, value }) => {
            form.set((write) => {
              write.data[col] = value;
            });
          }}
        />
      </div>
    </div>
  );
};

const RecursiveFields: FC<{
  model: Models[keyof Models];
  fields: Fields<ModelName>;
  data: any;
  onChange: (arg: { col: string; value: any }) => void;
}> = ({ model, fields, data, onChange }) => {
  if (!fields) return null;

  if (Array.isArray(fields)) {
    return (
      <>
        {fields.map((field, index) => (
          <RecursiveFields
            key={index}
            model={model}
            fields={field}
            data={data}
            onChange={onChange}
          />
        ))}
      </>
    );
  }

  if ("vertical" in fields) {
    return (
      <div className="flex flex-col gap-4">
        {fields.vertical.map((field, index) => (
          <RecursiveFields
            key={index}
            model={model}
            fields={field}
            data={data}
            onChange={onChange}
          />
        ))}
      </div>
    );
  }

  if ("horizontal" in fields) {
    return (
      <div className="flex flex-row gap-4">
        {fields.horizontal.map((field, index) => (
          <RecursiveFields
            key={index}
            model={model}
            fields={field}
            data={data}
            onChange={onChange}
          />
        ))}
      </div>
    );
  }

  if ("col" in fields) {
    return (
      <Field
        model={model}
        col={fields.col}
        data={data}
        onChange={(value) => {
          onChange({ col: fields.col, value });
        }}
      />
    );
  }

  return null;
};

const Field: FC<{
  model: Models[keyof Models];
  col: string;
  data: any;
  onChange: (value: any) => void;
}> = ({ model, col, data, onChange }) => {
  const config = model.config.columns[col];
  const value = data?.[col];
  return (
    <div className="field flex-1 flex flex-col gap-1 text-sm">
      <label className="font-medium">{config.label}</label>
      <Input
        className="bg-white"
        value={value}
        onChange={(e) => {
          onChange(e.currentTarget.value);
        }}
      />
    </div>
  );
};
