import { WarnFull } from "@/components/app/warn-full";
import { Spinner } from "@/components/ui/spinner";
import { useModel } from "@/hooks/use-model";
import { useModelDetail } from "@/hooks/use-model-detail";
import { FC } from "react";
import { ModelName, Models } from "shared/types";
import { Fields } from "system/model/layout/types";

export const MDetail: FC<{ modelName: ModelName }> = ({ modelName }) => {
  const model = useModel({ modelName });
  const detail = useModelDetail({ model });
  if (!model.ready || detail.loading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    );

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
      <RecursiveFields
        model={model.instance}
        fields={detail.current.fields}
        data={detail.data}
      />
    </>
  );
};

const RecursiveFields: FC<{
  model: Models[keyof Models];
  fields: Fields<ModelName>;
  data: any;
}> = ({ model, fields, data }) => {
  if (!fields) return null;

  if (Array.isArray(fields)) {
    return (
      <>
        {fields.map((field, index) => (
          <RecursiveFields key={index} model={model} fields={field} data={data} />
        ))}
      </>
    );
  }

  if ("vertical" in fields) {
    return (
      <div className="flex flex-col gap-4">
        {fields.vertical.map((field, index) => (
          <RecursiveFields key={index} model={model} fields={field} data={data} />
        ))}
      </div>
    );
  }

  if ("horizontal" in fields) {
    return (
      <div className="flex flex-row gap-4">
        {fields.horizontal.map((field, index) => (
          <RecursiveFields key={index} model={model} fields={field} data={data} />
        ))}
      </div>
    );
  }

  if ("col" in fields) {
    return <Field model={model} col={fields.col} data={data} />;
  }

  return null;
};

const Field: FC<{ model: Models[keyof Models]; col: string; data: any }> = ({
  model,
  col,
  data,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-medium">{col}</label>
      <div>{data?.[col] ?? "-"}</div>
    </div>
  );
};
