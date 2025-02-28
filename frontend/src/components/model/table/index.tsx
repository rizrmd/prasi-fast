import { AppLoading } from "@/components/app/app-loading";
import { WarnFull } from "@/components/app/warn-full";
import { DataTable } from "@/components/model/table/data-table";
import { useModelTable } from "@/hooks/model-table/use-model-table";
import { useModel } from "@/hooks/use-model";
import { composeHash, extractHash } from "@/lib/parse-hash";
import { navigate } from "@/lib/router";
import { FC } from "react";
import { ModelName } from "shared/types";

export const MTable: FC<{ modelName: ModelName }> = ({ modelName }) => {
  const model = useModel({ modelName });
  const table = useModelTable({ model });

  if (!model.ready || table.loading) return <AppLoading />;

  if (!table.available) {
    return (
      <WarnFull>
        Tampilan secara tabel <br />
        tidak tersedia
      </WarnFull>
    );
  }

  return (
    <DataTable
      modelTable={table}
      primaryKey={model.instance?.config.primaryKey || "id"}
      status={table.loading ? "loading" : "ready"}
      checkbox={
        table.current?.checkbox || {
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
