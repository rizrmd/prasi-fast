import { SimpleTooltip } from "@/components/ext/simple-tooltip";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/global-alert";
import { Spinner } from "@/components/ui/spinner";
import { useReader } from "@/hooks/use-read-write";
import { navigate, useParams } from "@/lib/router";
import { cn } from "@/lib/utils";
import { css } from "goober";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Save,
  Trash
} from "lucide-react";
import { FC } from "react";
import { Models } from "shared/types";
import { toast } from "sonner";
import { snapshot } from "valtio";
import { FormWriter } from "../types";
import { DetailHash } from "../../utils/hash-type";

export const Toolbar: FC<{
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
        {!form.unsaved && !DetailHash.includes(params.id) && (
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

        {!form.unsaved && !DetailHash.includes(params.id) && (
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
            {!DetailHash.includes(params.id) && (
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
