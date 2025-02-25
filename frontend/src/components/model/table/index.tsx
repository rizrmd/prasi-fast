import { WarnFull } from "@/components/app/warn-full";
import { DataTable } from "@/components/ext/data-table";
import { Spinner } from "@/components/ui/spinner";
import { useModel } from "@/hooks/use-model";
import { useModelTable } from "@/hooks/use-model-table";
import { FC } from "react";
import { ModelName } from "shared/types";

export const MTable: FC<{ modelName: ModelName }> = ({ modelName }) => {
  const model = useModel({ modelName });
  const table = useModelTable({ model });
  if (!model.ready || !table.ready)
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    );

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
      columns={table.columns}
      data={Array.isArray(table.result?.data) ? table.result.data : []}
      status={table.loading ? 'loading' : 'ready'}
    />
  );
};
