import { Children, FC } from "react";
import { ModelName, Models } from "shared/types";
import { Fields } from "system/model/layout/types";
import { FormWriter } from "../types";
import { FieldInput } from "./input/field";
import { FieldRelation } from "./input/relation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  if ("heading" in fields) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">{fields.heading}</h2>
        <div className="space-y-4">
          {fields.fields.map((field, index) => (
            <RecursiveFields
              key={index}
              model={model}
              fields={field}
              writer={writer}
              onChange={onChange}
            />
          ))}
        </div>
      </div>
    );
  }

  if ("section" in fields) {
    return (
      <Accordion type="single" collapsible className="w-full mb-6">
        <AccordionItem value="section">
          <AccordionTrigger className="text-lg font-semibold">
            {fields.section}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
              {fields.fields.map((field, index) => (
                <RecursiveFields
                  key={index}
                  model={model}
                  fields={field}
                  writer={writer}
                  onChange={onChange}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
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
    let label = model.config.relations[relName].label || "-";
    return (
      <Label label={label}>
        <FieldRelation
          rootModel={model}
          field={fields}
          writer={writer}
          label={label}
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
