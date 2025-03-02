import { ModelContainer } from "@/components/model/container";
import { MTable } from "@/components/model/list";
import { useParams } from "@/lib/router";
import * as models from "shared/models";
import { ModelName } from "shared/types";

export default () => {
  return (
    <ModelContainer>{({ tabId }) => <MTable tabId={tabId} />}</ModelContainer>
  );
};
