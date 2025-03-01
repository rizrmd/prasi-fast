import { Children, FC } from "react";
import { ModelName, Models } from "shared/types";
import { Fields } from "system/model/layout/types";
import { FormWriter } from "../types";
import { FieldInput } from "./input/field";
import { FieldRelation } from "./input/relation";

export const RecursiveFields: FC<{
  model: Models[keyof Models];
  fields: Fields<ModelName>;
  writer: FormWriter;
  onChange: (arg: { col: string; value: any }) => void;
}> = ({ model, fields, writer, onChange }) => {
  if (!fields) return null;

  if (Array.isArray(fields)) {
    return (
      <>
        {fields.map((field, index) => (
          <RecursiveFields
            key={index}
            model={model}
            fields={field}
            writer={writer}
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
            writer={writer}
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
            writer={writer}
            onChange={onChange}
          />
        ))}
      </div>
    );
  }

  if ("rel" in fields) {
    let relName = typeof fields.rel === "string" ? fields.rel : "";
    return (
      <Label label={model.config.relations[relName].label}>
        <FieldRelation
          model={model}
          field={fields}
          writer={writer}
          onChange={({ col, value }) => {
            onChange({ col, value });
          }}
        />
      </Label>
    );
  }

  if ("col" in fields) {
    return (
      <Label label={model.config.columns[fields.col].label}>
        <FieldInput
          model={model}
          col={fields.col}
          writer={writer}
          onChange={(value) => {
            onChange({ col: fields.col, value });
          }}
        />
      </Label>
    );
  }

  return null;
};

const Label: FC<{ children: any; label?: string }> = ({ children, label }) => {
  return (
    <label className="field flex-1 flex flex-col gap-1 text-sm">
      <div className="font-medium">{label}</div>
      {children}
    </label>
  );
};
