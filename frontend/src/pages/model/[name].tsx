import { MTable } from "@/components/model/table";
import { useParams } from "@/lib/router";
import * as models from "shared/models";
import { ModelName } from "shared/types";
export default () => {
  const params = useParams();
  let modelName = Object.keys(models).find((e) => {
    if (params.name.toLowerCase() === e.toLowerCase()) {
      return true;
    }
  }) as ModelName;
  if (!modelName) modelName = params.name as any;

  return (
    <div className="p-3">
      <MTable modelName={modelName} />
    </div>
  );
};
