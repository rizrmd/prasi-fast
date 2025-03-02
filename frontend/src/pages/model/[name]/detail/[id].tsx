import { ModelContainer } from "@/components/model/container";
import { MDetail } from "@/components/model/detail";

export default () => {
  return (
    <ModelContainer>{({ tabId }) => <MDetail tabId={tabId} />}</ModelContainer>
  );
};
