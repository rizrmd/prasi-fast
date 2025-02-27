import { ModelContainer } from "@/components/model/container";
import { MDetail } from "@/components/model/detail";
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

  return (
    <ModelContainer modelName={modelName}>
      <MDetail modelName={modelName} />
    </ModelContainer>
  );
};
