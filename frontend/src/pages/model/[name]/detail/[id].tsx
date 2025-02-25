import { ModelContainer } from "@/components/model/container";
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

  return <ModelContainer>asdas</ModelContainer>;
};
