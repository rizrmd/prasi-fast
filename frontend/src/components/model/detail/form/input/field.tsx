import { Input } from "@/components/ui/input";
import { useLocal } from "@/hooks/use-local";
import { useReader } from "@/hooks/use-read-write";
import { FC, useEffect } from "react";
import { Models } from "shared/types";
import { FormWriter } from "../../types";

export const FieldInput: FC<{
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

  return (
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
  );
};
