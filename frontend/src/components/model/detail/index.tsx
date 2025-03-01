import { AppLoading } from "@/components/app/app-loading";
import { WarnFull } from "@/components/app/warn-full";
import { useModel } from "@/hooks/use-model";
import { useModelDetail } from "@/hooks/use-model-detail";
import { FC } from "react";
import { ModelName } from "shared/types";
import { MDetailTabs } from "./detail-tabs";
import { DetailForm } from "./form/form";

export const MDetail: FC<{ modelName: ModelName }> = ({ modelName }) => {
  const model = useModel({ modelName });
  const detail = useModelDetail({ model, variant: "default" });

  if (!model.ready || !detail.current) return <AppLoading />;
  if (!model.instance || !detail.current) {
    return (
      <WarnFull>
        Tampilan secara tabel <br />
        tidak tersedia
      </WarnFull>
    );
  }

  return (
    <>
      <div className="rounded-md border bg-white">
        <MDetailTabs model={model.instance} detail={detail}>
          {({ activeTab, writer, reader }) => {
            if (
              activeTab.type === "default" &&
              model.instance &&
              detail.current
            ) {
              return (
                <DetailForm
                  model={model.instance}
                  detail={detail}
                  unsavedData={reader.unsavedTabs[reader.idx]}
                  onChanged={(data) => {
                    writer.unsavedTabs[writer.idx] = data;
                  }}
                />
              );
            }
          }}
        </MDetailTabs>
      </div>
    </>
  );
};
