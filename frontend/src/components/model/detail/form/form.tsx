import { AppLoading } from "@/components/app/app-loading";
import { Alert } from "@/components/ui/global-alert";
import { useModelDetail } from "@/hooks/use-model-detail";
import { useReader, useWriter } from "@/hooks/use-read-write";
import { parseHash } from "@/lib/parse-hash";
import { navigate, useParams } from "@/lib/router";
import { cn } from "@/lib/utils";
import { css } from "goober";
import { Check } from "lucide-react";
import { FC, useEffect } from "react";
import { Models } from "shared/types";
import { toast } from "sonner";
import { snapshot } from "valtio";
import { RecursiveFields } from "./recursive-fields";
import { Toolbar } from "./toolbar";
import { FormWriter } from "../types";

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
      recordId: "",
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
    if (isLoading) {
      return;
    }
    const resetError = () => {
      writer.error.fields = {};
      writer.error.system = "";
      writer.error.recordId = "";
    };

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
    } else if (
      unsavedData &&
      unsavedData[model.config.primaryKey] === params.id
    ) {
      writer.data = structuredClone(data);
      for (const [k, v] of Object.entries(unsavedData)) {
        writer.data[k] = v;
      }
      resetError();
      writer.unsaved = true;
    } else {
      if (form.error.system && form.error.recordId === params.id) {
        return;
      }

      resetError();
      writer.unsaved = false;
      writer.data = structuredClone(data);
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

        if (!res.success) {
          writer.unsaved = true;
          writer.error.system = res.error.message;
          writer.error.recordId = params.id;
          toast("Data Gagal Tersimpan !", {
            dismissible: true,
            richColors: true,
            duration: 10000,
            action: {
              label: "Detail Teknis",
              onClick: () => Alert.info(res.error.message),
            },
            className: css`
              border: 0 !important;
              background: #a31616 !important;
            `,
          });
        } else {
          writer.unsaved = false;
          onChanged?.(undefined);

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
          writer.error.fields = {};
          writer.error.system = "";
          writer.error.recordId = "";
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
        {JSON.stringify(form.data)}
      </div>
    </form>
  );
};
