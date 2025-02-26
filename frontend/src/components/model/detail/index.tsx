import { WarnFull } from "@/components/app/warn-full";
import { Spinner } from "@/components/ui/spinner";
import { useModel } from "@/hooks/use-model";
import { useModelDetail } from "@/hooks/use-model-detail";
import { FC } from "react";
import { ModelName } from "shared/types";

export const MDetail: FC<{ modelName: ModelName }> = ({ modelName }) => {
  const model = useModel({ modelName });
  const detail = useModelDetail({ model });
  if (!model.ready || !detail.ready)
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    );

  if (!detail.available) {
    return (
      <WarnFull>
        Tampilan secara tabel <br />
        tidak tersedia
      </WarnFull>
    );
  }

  return <>ini detail</>;
};
