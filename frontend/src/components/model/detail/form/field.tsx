import { Input } from "@/components/ui/input";
import { Models } from "shared/types";
import { FC } from "react";
import { FormWriter } from "../types";
import { useReader } from "@/hooks/use-read-write";

export const Field: FC<{
  model: Models[keyof Models];
  col: string;
  writer: FormWriter;
  onChange: (value: any) => void;
}> = ({ model, col, writer, onChange }) => {
  const form = useReader(writer);

  const config = model.config.columns[col];
  const value = form.data[col];
  return (
    <label className="field flex-1 flex flex-col gap-1 text-sm">
      <div className="font-medium">{config.label}</div>
      <Input
        asDiv={form.resetting}
        type="text"
        className="bg-white"
        defaultValue={value || ""}
        onInput={(e) => {
          const value = (e.target as HTMLInputElement).value;
          writer.data[col] = value;
          writer.unsaved = true;
          onChange(value);
        }}
      />
    </label>
  );
};
