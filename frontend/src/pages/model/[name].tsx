import { AppLoading } from "@/components/app/app-loading";
import { ModelContainer } from "@/components/model/container";
import { ModelFilter } from "@/components/model/list/model-filter";
import { ModelList } from "@/components/model/list/model-list";
import { useValtioTab } from "@/hooks/use-valtio-tab";
import { tabInitList } from "@/hooks/use-valtio-tabs/list-manager/list-init";
import { useSnapshot } from "valtio";

export default () => {
  const tab = useValtioTab({ root: true });
  const reader = useSnapshot(tab.state);

  if (!reader.list.ready) {
    tabInitList(tab);
  }

  return (
    <ModelContainer>
      {reader.list.loading ? (
        <>
          <AppLoading />
        </>
      ) : (
        <>
          <ModelFilter />
          <ModelList />
        </>
      )}
    </ModelContainer>
  );
};
