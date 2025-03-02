import { AppLoading } from "@/components/app/app-loading";
import { Alert } from "@/components/ui/global-alert";
import { useValtioTab } from "@/hooks/use-valtio-tab";
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
  tab: ReturnType<typeof useValtioTab>;
  tabId: string;
  onChanged?: (changedData: any) => void;
  unsavedData?: any;
}> = ({ model, onChanged, unsavedData, tab, tabId }) => {
  const params = useParams();
  const data = tab.detail?.data;
  const prevId = tab.op.pagination.canPrev ? tab.list?.data?.[tab.detail?.idx - 1]?.id : null;
  const nextId = tab.op.pagination.canNext ? tab.list?.data?.[tab.detail?.idx + 1]?.id : null;
  
  const fields = tab.config?.layout?.detail?.default?.fields;
  
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
    prevId: prevId,
    nextId: nextId,
  } as FormWriter);
  const form = useReader(writer);

  const isLoading = tab.status !== "ready" || !data || form.saving;

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

  // Function to save data using the tab's model's save capability
  interface SaveResponse {
    success: boolean;
    error?: {
      message: string;
    };
    newId?: string;
  }

  const saveData = async (formData: any): Promise<SaveResponse> => {
    try {
      if (!model.config?.modelName) {
        throw new Error("Model not properly configured");
      }
      
      // Cast to any to handle the dynamic nature of model methods
      const modelWithSave = tab.config?.model as any;
      const res = await modelWithSave.save(formData);
      
      // Transform response to match expected format
      if (!res || typeof res !== 'object') {
        throw new Error("Invalid response from save operation");
      }

      // If res has an id property, consider it a success
      if ('id' in res) {
        return {
          success: true,
          newId: res.id
        };
      }

      return res as SaveResponse;
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message || "Error saving data"
        }
      };
    }
  };

  interface DeleteResponse {
    success: boolean;
    error?: {
      message: string;
    };
  }

  // Function to delete data
  const deleteData = async (): Promise<DeleteResponse> => {
    try {
      if (!model.config?.modelName) {
        throw new Error("Model not properly configured");
      }

      const where = { [model.config.primaryKey]: params.id };
      // Cast to any to handle the dynamic nature of model methods
      const modelWithDelete = tab.config?.model as any;
      const res = await modelWithDelete.delete({ where });
      
      if (!res.success) {
        toast("Data Gagal Dihapus !", {
          dismissible: true, 
          richColors: true,
          duration: 10000,
          action: {
            label: "Detail Teknis",
            onClick: () => Alert.info(res.error?.message || "Unknown error"),
          },
          className: css`
            border: 0 !important;
            background: #a31616 !important;
          `,
        });
      } else {
        toast(
          <div className="flex items-center space-x-1 cursor-default select-none">
            <Check /> <div>Data Berhasil Dihapus !</div>
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
        // Navigate back to list view after successful delete
        navigate(`/model/${model.config.modelName.toLowerCase()}`);
      }
      return res;
    } catch (error: any) {
      toast("Data Gagal Dihapus !", {
        dismissible: true,
        richColors: true,
        duration: 10000,
        action: {
          label: "Detail Teknis",
          onClick: () => Alert.info(error.message || "Error deleting data"),
        },
        className: css`
          border: 0 !important;
          background: #a31616 !important;
        `,
      });
      return {
        success: false,
        error: {
          message: error.message || "Error deleting data"
        }
      };
    }
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        writer.saving = true;

        const res = await saveData(snapshot(writer.data));
        writer.saving = false;

        if (!res.success) {
          writer.unsaved = true;
          writer.error.system = res.error?.message || "Unknown error";
          writer.error.recordId = params.id;
          toast("Data Gagal Tersimpan !", {
            dismissible: true,
            richColors: true,
            duration: 10000,
            action: {
              label: "Detail Teknis",
              onClick: () => Alert.info(res.error?.message || "Unknown error"),
            },
            className: css`
              border: 0 !important;
              background: #a31616 !important;
            `,
          });
        } else {
          writer.unsaved = false;
          onChanged?.(undefined);
          
          // Refresh the tab data after save
          if (tab.mode === "detail") {
            tab.op.refreshDetail();
          }

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
        loading={tab.status !== "ready"}
        del={deleteData}
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
      </div>
    </form>
  );
};
