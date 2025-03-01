import { AppLoading } from "@/components/app/app-loading";
import { WarnFull } from "@/components/app/warn-full";
import { useModelList } from "@/hooks/model-list/use-model-list";
import { useModel } from "@/hooks/use-model";
import { composeHash, extractHash } from "@/lib/parse-hash";
import { navigate } from "@/lib/router";
import { FC } from "react";
import { ModelName } from "shared/types";
import { DataTable } from "./data-table";

export const MTable: FC<{ modelName: ModelName }> = ({ modelName }) => {
  const model = useModel({ modelName });
  const list = useModelList({ model, variant: "default" });

  if (!model.ready || list.loading) return <AppLoading />;

  if (!list.available) {
    return (
      <WarnFull>
        Tampilan secara tabel <br />
        tidak tersedia
      </WarnFull>
    );
  }

  return (
    <DataTable
      modelTable={list}
      primaryKey={model.instance?.config.primaryKey || "id"}
      status={list.loading ? "loading" : "ready"}
      checkbox={
        list.current?.checkbox || {
          enabled: true,
        }
      }
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
