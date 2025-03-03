import { AppLoading } from "@/components/app/app-loading";
import { useValtioTab } from "@/hooks/use-valtio-tab";
import { ProtectedRoute } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { css } from "goober";
import { FC, isValidElement, ReactNode } from "react";
import { useSnapshot } from "valtio";
import { SimpleTooltip } from "../ext/simple-tooltip";
import { Button } from "../ui/button";
import { ModelNavTabs } from "./nav-tabs";
import { ModelBreadList } from "./bread/bread-list";
import { ModelBreadAction } from "./bread/bread-action";

export const ModelContainer: FC<{
  children: ReactNode;
}> = ({ children }) => {
  const tab = useValtioTab({ root: true });
  const state = useSnapshot(tab.state);
  const tabId = tab.state.id;

  return (
    <ProtectedRoute>
      <div className="flex flex-col flex-1 bg-slate-100">
        <ModelNavTabs />

        <div className="flex border-b  bg-white items-stretch justify-between">
          <ModelBreadList />
          <ModelBreadAction />
        </div>
        <div className="p-2 flex flex-1 items-stretch flex-col">
          {tabId ? (
            children
          ) : (
            <div className="flex items-center justify-center h-full">
              <AppLoading />
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};
