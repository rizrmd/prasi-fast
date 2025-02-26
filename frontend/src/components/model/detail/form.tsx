import { SimpleTooltip } from "@/components/ext/simple-tooltip";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/global-alert";
import { Input } from "@/components/ui/input";
import { useReader, useWriter } from "@/hooks/use-read-write";
import { parseHash } from "@/lib/parse-hash";
import { navigate, useParams } from "@/lib/router";
import { cn } from "@/lib/utils";
import { css } from "goober";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Save,
  Trash,
} from "lucide-react";
import { FC, useEffect } from "react";
import { ModelName, Models } from "shared/types";
import { Fields } from "system/model/layout/types";
import { snapshot } from "valtio";

type FormWriter = { data: any; unsaved: boolean; resetting: boolean };

export const DetailForm: FC<{
  model: Models[keyof Models];
  fields: Fields<ModelName>;
  data: any;
  onChanged?: (changedData: any) => void;
  unsavedData?: any;
}> = ({ model, fields, data, onChanged, unsavedData }) => {
  const params = useParams();
  const writer = useWriter({
    data: {} as any,
    unsaved: false,
    resetting: false,
  } as FormWriter);

  if (!fields) return null;

  useEffect(() => {
    if (params.id === "clone") {
      const prev_id = parseHash()["prev"];
      if (!prev_id) {
        navigate(`/model/${model.config.modelName.toLowerCase()}/new`);
      } else {
        const newData = structuredClone(data);
        writer.data = newData;
        delete writer.data[model.config.primaryKey];
        writer.unsaved = true;
        onChanged?.(newData);
      }
    } else if (unsavedData) {
      const snapshotData = snapshot(unsavedData);
      writer.data = structuredClone(data);
      for (const [k, v] of Object.entries(snapshotData)) {
        writer.data[k] = v;
      }
      writer.unsaved = true;
    } else {
      writer.data = structuredClone(data);
      writer.unsaved = false;
      onChanged?.(undefined);
    }
  }, [data]);

  return (
    <div className={cn("flex flex-col items-stretch flex-1 -mt-3")}>
      <Toolbar
        writer={writer}
        model={model}
        onReset={() => {
          const prev_id = parseHash()["prev"];
          if (params.id === "clone" && prev_id) {
            navigate(
              `/model/${model.config.modelName.toLowerCase()}/detail/${prev_id}`
            );
            return;
          }
          onChanged?.(undefined);

          writer.data = structuredClone(data);
          writer.unsaved = false;
          writer.resetting = true;
          setTimeout(() => {
            writer.resetting = false;
          }, 100);
        }}
      />
      <div className="flex flex-1 relative flex-col items-stretch">
        <RecursiveFields
          model={model}
          fields={fields}
          writer={writer}
          onChange={({ col, value }) => {
            onChanged?.(snapshot(writer.data));
          }}
        />
      </div>
    </div>
  );
};

const Toolbar: FC<{
  writer: FormWriter;
  onReset: (from: string) => void;
  model: Models[keyof Models];
}> = ({ writer, model, onReset }) => {
  const params = useParams();
  const form = useReader(writer);

  return (
    <div
      className={cn(
        "rounded-md border border-sidebar-border h-[40px] bg-sidebar mb-2 flex items-stretch p-[5px] rounded-t-none border-t-0 justify-between select-none",
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
        {!form.unsaved && !["new", "clone"].includes(params.id) && (
          <SimpleTooltip content="Duplikat data ini">
            <Button
              size="sm"
              variant={"outline"}
              className={cn("text-xs rounded-sm cursor-pointer")}
              href={`/model/${model.config.modelName.toLowerCase()}/detail/clone#prev=${
                params.id
              }`}
            >
              <Copy strokeWidth={1.5} />
            </Button>
          </SimpleTooltip>
        )}

        {!form.unsaved && !["new", "clone"].includes(params.id) && (
          <SimpleTooltip content="Tambah data baru">
            <Button
              size="sm"
              href={`/model/${model.config.modelName.toLowerCase()}/detail/new#prev=${
                params.id
              }`}
              className={cn("text-xs rounded-sm cursor-pointer")}
              variant={"outline"}
            >
              <Plus strokeWidth={1.5} />
              <div className="-ml-1">Tambah</div>
            </Button>
          </SimpleTooltip>
        )}
        {form.unsaved && (
          <div className="text-xs text-red-400 flex items-center bg-white px-2 rounded-md space-x-1 border border-red-100">
            <div>Belum disimpan</div>
            <SimpleTooltip content="Reset perubahan">
              <Button
                size="sm"
                variant={"outline"}
                className={cn(
                  "text-xs rounded-sm px-2 cursor-pointer text-black"
                )}
                onClick={async () => {
                  const confirmed = await Alert.confirm(
                    "Apakah anda yakin ingin me-reset data ini seperti awal?"
                  );

                  if (confirmed) {
                    onReset("reset");
                  }
                }}
              >
                <div className="">Reset</div>
              </Button>
            </SimpleTooltip>
          </div>
        )}
      </div>
      <div className="flex items-stretch space-x-1">
        <SimpleTooltip content="Hapus data ini">
          <Button
            size="icon"
            variant={"outline"}
            className={cn(
              "text-xs rounded-sm cursor-pointer text-red-400  border-red-100 hover:border-red-300 hover:text-red-500 transition-all border"
            )}
            onClick={async () => {
              const confirmed = await Alert.confirm(
                "Apakah anda yakin ingin menghapus data ini?"
              );
              if (confirmed) {
                Alert.info("terhapus!");
              }
            }}
          >
            <Trash strokeWidth={1.5} />
          </Button>
        </SimpleTooltip>
        <Button size="sm" className={cn("text-xs rounded-sm cursor-pointer")}>
          <Save /> Simpan
        </Button>
      </div>
    </div>
  );
};

const RecursiveFields: FC<{
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

  if ("col" in fields) {
    return (
      <Field
        model={model}
        col={fields.col}
        writer={writer}
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
