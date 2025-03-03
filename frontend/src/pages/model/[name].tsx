import { ModelContainer } from "@/components/model/container";
import { ModelFilter } from "@/components/model/list/model-filter";
import { ModelList } from "@/components/model/list/model-list";

export default () => {
  return (
    <ModelContainer>
      <ModelFilter />
      <ModelList />
    </ModelContainer>
  );
};
