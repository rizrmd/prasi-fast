import { AppLoading } from "@/components/app/app-loading";
import { WarnFull } from "@/components/app/warn-full";
import { composeHash, extractHash } from "@/lib/parse-hash";
import { navigate } from "@/lib/router";
import { FC, useEffect } from "react";
import { ModelName } from "shared/types";
import { DataTable } from "./data-table";
import cuid from "@bugsnag/cuid";
import { addBreadcrumbsToTabData } from "../container";
import { useValtioTab } from "@/hooks/use-valtio-tab";

export const MTable: FC<{ tabId: string }> = ({ tabId }) => {
  const tab = useValtioTab(tabId);

  console.log(tab.config?.layout?.list.default.columns.map(e=>e.col));
  useEffect(() => {
    if (
      tab.status === "ready" &&
      tab.mode === "list" &&
      tab.list?.data?.length === 0
    ) {
      // Load initial data if not already loaded
      tab.op.queryList();
    }
  }, [tab.status]);

  // Show loading when initializing
  if (tab.status === "init") {
    return <AppLoading />;
  }

  // Get model from tab.config
  const modelName = tab.config?.modelName as ModelName;
  const model = { instance: tab.config?.model, ready: tab.status === "ready" };

  if (!model.instance || !tab.config?.layout?.list) {
    return (
      <WarnFull>
        Tampilan secara tabel <br />
        tidak tersedia
      </WarnFull>
    );
  }

  // Determine the status based on loading state and tab status
  const status =
    tab.status !== "ready" || tab.loading?.list ? "loading" : "ready";

  return (
    <DataTable
      modelTable={tab}
      tabId={tabId}
      primaryKey={model.instance?.config.primaryKey || "id"}
      status={status}
      checkbox={{
        enabled: true,
      }}
      onRowClick={(row) => {
        const parentId = extractHash("parent");

        navigate(
          "/model/" +
            modelName.toLowerCase() +
            "/detail/" +
            row.id +
            `${composeHash({ parent: parentId })}`
        );
      }}
    />
  );
};
