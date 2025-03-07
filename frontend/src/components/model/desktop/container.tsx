import { AppLoading } from "@/components/app/app-loading";
import { TabManager } from "@/hooks/use-valtio-tabs/tab-manager";
import { ProtectedRoute } from "@/lib/auth";
import { FC, ReactNode } from "react";
import { useSnapshot } from "valtio";
import { ModelBreadAction } from "./bread/bread-action";
import { ModelBreadList } from "./bread/bread-list";
import { ModelNavTabs } from "./nav-tabs";

export const ModelContainer: FC<{
  children: ReactNode;
}> = ({ children }) => {
  const manager = useSnapshot(TabManager.state);

  if (manager.activeIdx === -1) {
    return (
      <div className="flex items-center justify-center h-full">
        <AppLoading />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col flex-1 bg-slate-100 select-none">
        <ModelNavTabs />

        <div className="flex border-b bg-white items-stretch justify-between">
          <ModelBreadList />
          <ModelBreadAction />
        </div>
        <div className="flex flex-1 items-stretch flex-col">{children}</div>
      </div>
    </ProtectedRoute>
  );
};
