import { AppLoading } from "@/components/app/app-loading";
import { SimpleTooltip } from "@/components/ext/simple-tooltip";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/global-alert";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useModelDetail } from "@/hooks/use-model-detail";
import { useReader, useWriter } from "@/hooks/use-read-write";
import { parseHash } from "@/lib/parse-hash";
import { navigate, useParams } from "@/lib/router";
import { cn } from "@/lib/utils";
import { css } from "goober";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Save,
  Trash,
} from "lucide-react";
import { FC, useEffect } from "react";
import { ModelName, Models } from "shared/types";
import { toast } from "sonner";
import { Fields } from "system/model/layout/types";
import { snapshot } from "valtio";
import { NotID } from "./utils";

type FormWriter = {
  data: any;
  unsaved: boolean;
  resetting: boolean;
  saving: boolean;
  deleting: boolean;
  prevId: string | null;
  nextId: string | null;
  error: {
    fields: Record<string, string>;
    system: string;
  };
};

export const DetailForm: FC<{
  model: Models[keyof Models];
  detail: ReturnType<typeof useModelDetail>;
  onChanged?: (changedData: any) => void;
  unsavedData?: any;
}> = ({ model, onChanged, unsavedData, detail }) => {
  const { del, save, data, prevId, nextId } = detail;
  const fields = detail.current?.fields;
  const params = useParams();
  const writer = useWriter({
    data: {} as any,
    unsaved: false,
    resetting: false,
    error: {
      fields: {},
      system: "",
    },
    saving: false,
    prevId: prevId || null,
    nextId: nextId || null,
  } as FormWriter);
  const form = useReader(writer);

  const isLoading = detail.loading || detail.data === null || form.saving;

  useEffect(() => {
    writer.nextId = nextId;
    writer.prevId = prevId;
  }, [prevId, nextId]);

  useEffect(() => {
    writer.unsaved = false;

    if (isLoading) {
      writer.error.system = "";
      onChanged?.(undefined);
      return;
    }

    if (params.id === "clone") {
      const prev_id = parseHash()["prev"];
      if (!prev_id) {
        navigate(`/model/${model.config.modelName.toLowerCase()}/detail/new`);
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
      writer.error.system = "";
      onChanged?.(undefined);
    }
  }, [data, isLoading]);

  if (!fields) return null;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        writer.saving = true;

        const res = await save(snapshot(writer.data));

        writer.saving = false;
        writer.unsaved = false;
        onChanged?.(undefined);

        if (!res.success) {
          writer.error.system = res.error.message;
          toast("Data Gagal Tersimpan !", {
            dismissible: true,
            richColors: true,
            duration: 10000,
            action: {
              label: "Info Teknis",
              onClick: () => Alert.info(res.error.message),
            },
            className: css`
              border: 0 !important;
              background: #a31616 !important;
            `,
          });
        } else {
          toast(
            <div className="flex items-center space-x-1 cursor-default select-none">
              <Check /> <div>Data Berhasil Tersimpan !</div>
            </div>,
            {
              dismissible: true,
              richColors: true,
              className: css`
                border: 0 !important;
                background: #1fa316 !important;
              `,
            }
          );
        }

        if (res.newId) {
          navigate(
            `/model/${model.config.modelName.toLowerCase()}/detail/${res.newId}`
          );
        }
      }}
      className={cn("flex flex-col items-stretch flex-1 -mt-3")}
    >
      <button type="submit" className="hidden"></button>
      <Toolbar
        writer={writer}
        model={model}
        loading={detail.loading}
        del={del}
        onReset={() => {
          const prev_id = parseHash()["prev"];
          onChanged?.(undefined);
          writer.unsaved = false;
          writer.resetting = true;
          writer.data = structuredClone(data);
          setTimeout(() => {
            writer.resetting = false;
          }, 100);

          if (params.id === "clone" && prev_id) {
            navigate(
              `/model/${model.config.modelName.toLowerCase()}/detail/${prev_id}`
            );
            return;
          }
        }}
      />
      <div className="flex flex-1 relative flex-col items-stretch">
        {isLoading ? (
          <AppLoading />
        ) : (
          <RecursiveFields
            model={model}
            fields={fields}
            writer={writer}
            onChange={({ col, value }) => {
              onChanged?.(snapshot(writer.data));
            }}
          />
        )}
      </div>
    </form>
  );
};

const Toolbar: FC<{
  writer: FormWriter;
  onReset: (from: string) => void;
  model: Models[keyof Models];
  loading: boolean;
  del: any;
}> = ({ writer, model, onReset, del, loading }) => {
  const params = useParams();
  const form = useReader(writer);

  return (
    <div
      className={cn(
        "rounded-md border border-sidebar-border h-[40px] bg-sidebar mb-2 flex items-stretch p-[5px] rounded-t-none border-t-0 justify-between select-none",
        css`
          .button {
            height: auto;
            padding: 0px 6px;
          }
        `
      )}
    >
      <div className="flex items-stretch space-x-1">
        <SimpleTooltip content="Data sebelumnya">
          <Button
            size="sm"
            asDiv
            variant={"outline"}
            href={
              form.prevId
                ? `/model/${model.config.modelName.toLowerCase()}/detail/${
                    form.prevId
                  }`
                : undefined
            }
            disabled={!form.prevId || form.unsaved}
            className={cn("text-xs rounded-sm cursor-pointer")}
          >
            <ChevronLeft />
          </Button>
        </SimpleTooltip>
        <SimpleTooltip content="Data selanjutnya">
          <Button
            asDiv
            size="sm"
            href={
              form.nextId
                ? `/model/${model.config.modelName.toLowerCase()}/detail/${
                    form.nextId
                  }`
                : undefined
            }
            variant={"outline"}
            disabled={!form.nextId || form.unsaved}
            className={cn("text-xs rounded-sm cursor-pointer")}
          >
            <ChevronRight />
          </Button>
        </SimpleTooltip>
        {!form.unsaved && !NotID.includes(params.id) && (
          <SimpleTooltip content="Duplikat data ini">
            <Button
              size="sm"
              asDiv
              variant={"outline"}
              disabled={loading}
              className={cn("text-xs rounded-sm cursor-pointer transition-all")}
              href={`/model/${model.config.modelName.toLowerCase()}/detail/clone#prev=${
                params.id
              }`}
            >
              <Copy strokeWidth={1.5} />
            </Button>
          </SimpleTooltip>
        )}

        {!form.unsaved && !NotID.includes(params.id) && (
          <SimpleTooltip content="Tambah data baru">
            <Button
              size="sm"
              asDiv
              href={`/model/${model.config.modelName.toLowerCase()}/detail/new#prev=${
                params.id
              }`}
              className={cn("text-xs rounded-sm cursor-pointer")}
              variant={"outline"}
              onClick={() => {
                writer.resetting = true;
                setTimeout(() => {
                  writer.resetting = false;
                }, 100);
              }}
            >
              <Plus strokeWidth={1.5} />
              <div className="-ml-1">Tambah</div>
            </Button>
          </SimpleTooltip>
        )}
        {form.unsaved && !form.saving && (
          <div
            className={cn(
              "text-xs flex items-center bg-white px-2 rounded-md space-x-1 border",
              "border-red-100 text-red-400"
            )}
          >
            <div>{"Belum disimpan"}</div>
            <SimpleTooltip content="Reset perubahan">
              <Button
                size="sm"
                asDiv
                variant={"outline"}
                className={cn(
                  "text-xs rounded-sm px-2 cursor-pointer text-black"
                )}
                onClick={async () => {
                  if ((window as any).DO_NOT_CONFIRM_RECORD_RESET) {
                    onReset("reset");
                  } else {
                    const confirmed = await Alert.confirm(
                      "Apakah anda yakin ingin me-reset data ini seperti awal?",
                      { checkbox: "Selanjutnya jangan tampilkan lagi" }
                    );

                    if (confirmed.confirm) {
                      if (confirmed.checkbox) {
                        (window as any).DO_NOT_CONFIRM_RECORD_RESET = true;
                      }
                      onReset("reset");
                    }
                  }
                }}
              >
                <div className="">Reset</div>
              </Button>
            </SimpleTooltip>
          </div>
        )}
        {form.error.system && (
          <div
            className={cn(
              "text-xs flex items-center bg-red-500 px-2 rounded-md space-x-4",
              " text-white"
            )}
          >
            <div>Sistem Gagal Menyimpan</div>
            <Button
              size="sm"
              asDiv
              variant={"outline"}
              className={cn(
                "text-xs rounded-sm px-2 cursor-pointer text-black"
              )}
              onClick={async () => {
                Alert.info(form.error.system);
              }}
            >
              <div className="">Detail Teknis</div>
            </Button>
          </div>
        )}
      </div>
      <div
        className={cn(
          "flex items-stretch space-x-1 transition-all",
          loading ? "opacity-0 translate-x-2" : "opacity-100"
        )}
      >
        {form.saving && (
          <div
            className={cn(
              "text-xs flex items-center bg-white px-2 rounded-md space-x-1 border border-blue-100"
            )}
          >
            <Spinner className="h-4 w-4" />{" "}
            <div>{form.deleting ? "Menghapus" : "Menyimpan"}...</div>
          </div>
        )}
        {!form.saving && (
          <>
            {!NotID.includes(params.id) && (
              <SimpleTooltip content="Hapus data ini">
                <Button
                  size="icon"
                  asDiv
                  variant={"outline"}
                  className={cn(
                    "text-xs rounded-sm cursor-pointer text-red-400  border-red-100 hover:border-red-300 hover:text-red-500 transition-all border"
                  )}
                  onClick={async () => {
                    const executeDelete = async () => {
                      writer.saving = true;
                      writer.deleting = true;
                      const data = snapshot(writer.data);
                      await del(snapshot(writer.data));
                      if (!(window as any).DO_NOT_WARN_RECORD_DELETE) {
                        const warn = await Alert.info(
                          `${model.config.modelName} ${model
                            .title(data)
                            .trim()}: Berhasil dihapus!`,
                          {
                            checkbox: "Selanjutnya jangan tampilkan lagi",
                          }
                        );

                        if (warn) {
                          (window as any).DO_NOT_WARN_RECORD_DELETE = true;
                        }
                      } else {
                        toast(
                          `${model.config.modelName} ${model
                            .title(data)
                            .trim()}: Berhasil dihapus!`,
                          { dismissible: true }
                        );
                      }
                      writer.saving = false;
                      writer.deleting = false;

                      if (form.nextId) {
                        navigate(
                          `/model/${model.config.modelName.toLowerCase()}/detail/${
                            form.nextId
                          }`
                        );
                      } else if (form.prevId) {
                        navigate(
                          `/model/${model.config.modelName.toLowerCase()}/detail/${
                            form.prevId
                          }`
                        );
                      } else {
                        navigate(
                          `/model/${model.config.modelName.toLowerCase()}`
                        );
                      }
                    };

                    if ((window as any).DO_NOT_CONFIRM_RECORD_DELETE) {
                      executeDelete();
                    } else {
                      const confirmed = await Alert.confirm(
                        "Apakah anda yakin ingin menghapus data ini?",
                        { checkbox: "Selanjutnya jangan tampilkan lagi" }
                      );

                      if (confirmed.confirm) {
                        if (confirmed.checkbox) {
                          (window as any).DO_NOT_CONFIRM_RECORD_DELETE = true;
                        }
                        executeDelete();
                      }
                    }
                  }}
                >
                  <Trash strokeWidth={1.5} />
                </Button>
              </SimpleTooltip>
            )}
            <Button
              type="submit"
              size="sm"
              variant={form.unsaved ? "default" : "outline"}
              disabled={!form.unsaved}
              className={cn("text-xs rounded-sm cursor-pointer")}
            >
              <Save /> Simpan
            </Button>
          </>
        )}
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
