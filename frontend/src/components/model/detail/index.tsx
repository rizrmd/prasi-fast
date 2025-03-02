import { AppLoading } from "@/components/app/app-loading";
import { WarnFull } from "@/components/app/warn-full";
import { useValtioTab } from "@/hooks/use-valtio-tab";
import { useParams } from "@/lib/router";
import { FC, useEffect } from "react";
import { ModelName } from "shared/types";
import { addBreadcrumbsToTabData } from "../container";
import { MDetailTabs } from "./detail-tabs";
import { DetailForm } from "./form/form";

export const MDetail: FC<{ tabId: string }> = ({ tabId }) => {
  const params = useParams();
  const tab = useValtioTab(tabId);

  useEffect(() => {
    if (tab.status === "ready" && params.id && tab.detail?.data) {
      // Update breadcrumbs when detail data is loaded
      const modelName = tab.config?.modelName as ModelName;
      if (modelName) {
        addBreadcrumbsToTabData(tabId, modelName);
      }
    }
  }, [tab.status, tab.detail?.data, params.id]);

  // Show loading when initializing
  if (tab.status === "init") return <AppLoading />;

  // Initialize detail if not already loaded
  if (tab.status === "ready" && tab.mode !== "detail" && params.id) {
    tab.op.queryDetail(params.id);
    return <AppLoading />;
  }

  // Show loading when detail data is being loaded
  if (tab.loading?.detail) {
    return <AppLoading />;
  }

  // Get model from tab.config
  const modelName = tab.config?.modelName as ModelName;
  const model = { 
    instance: tab.config?.model, 
    ready: tab.status === "ready" 
  };

  if (
    !model.instance ||
    tab.status !== "ready" ||
    tab.mode !== "detail" ||
    !tab.detail?.data
  ) {
    return (
      <WarnFull>
        Tampilan detail <br />
        tidak tersedia
      </WarnFull>
    );
  }

  return (
    <>
      <div className="rounded-md border bg-white">
        <MDetailTabs model={model.instance} tab={tab}>
          {({ activeTab, writer, reader }) => {
            if (activeTab.type === "default" && model.instance) {
              return (
                <DetailForm
                  model={model.instance}
                  tab={tab}
                  tabId={tabId}
                  unsavedData={reader.unsavedTabs[reader.idx]}
                  onChanged={(data) => {
                    writer.unsavedTabs[writer.idx] = data;
                  }}
                />
              );
            }

            // Handle other tab types if needed
            return null;
          }}
        </MDetailTabs>
      </div>
    </>
  );
};
