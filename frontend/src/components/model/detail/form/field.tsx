import { Input } from "@/components/ui/input";
import { Models } from "shared/types";
import { FC, useEffect } from "react";
import { FormWriter } from "../types";
import { useReader } from "@/hooks/use-read-write";
import { useLocal } from "@/hooks/use-local";

export const Field: FC<{
  model: Models[keyof Models];
  col: string;
  writer: FormWriter;
  onChange: (value: any) => void;
}> = ({ model, col, writer, onChange }) => {
  const form = useReader(writer);
  const local = useLocal({ ready: false, value: form.data[col] });
  useEffect(() => {
    if (local.value !== form.data[col]) {
      local.value = form.data[col];
      local.render();
    }
  }, [form.data[col]]);

  const config = model.config.columns[col];
  return (
    <label className="field flex-1 flex flex-col gap-1 text-sm">
      <div className="font-medium">{config.label}</div>
      <Input
        asDiv={form.resetting}
        type="text"
        className="bg-white"
        value={local.value || ""}
        onChange={(e) => {
          const value = (e.target as HTMLInputElement).value;
          local.value = value;
          local.render();
          
          writer.data[col] = value;
          writer.unsaved = true;
          onChange(value);
        }}
      />
    </label>
  );
};
