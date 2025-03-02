import { AppLoading } from "@/components/app/app-loading";
import { useValtioTab } from "@/hooks/use-valtio-tab";
import { ProtectedRoute } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { css } from "goober";
import { FC, isValidElement, ReactNode } from "react";
import { useSnapshot } from "valtio";
import { SimpleTooltip } from "../ext/simple-tooltip";
import { Button } from "../ui/button";
import { ModelBreadcrumb } from "./breadcrumb";
import { ModelNavTabs } from "./nav-tabs";

export const ModelContainer: FC<{
  children: (props: { tabId: string }) => ReactNode;
}> = ({ children }) => {
  const tab = useValtioTab({ root: true });
  const state = useSnapshot(tab.state);
  const tabId = tab.state.id;

  return (
    <ProtectedRoute>
      <div className="flex flex-col flex-1 bg-slate-100">
        <ModelNavTabs tabId={tabId} />

        <div className="flex border-b  bg-white items-stretch justify-between">
          <ModelBreadcrumb tabId={tabId} />
          <div
            className={cn(
              "flex px-2 py-1",
              css`
                .button {
                  height: auto;
                  min-height: 0;
                  padding: 0px 6px;
                }
              `
            )}
          >
            {state.breads.actions.map((item) => {
              return (
                <SimpleTooltip content={item.tooltip}>
                  <Button
                    size="sm"
                    asDiv
                    href={item.href}
                    className={cn("text-xs rounded-sm cursor-pointer")}
                    onClick={item.onClick}
                  >
                    {isValidElement(item.label) && item.label}
                  </Button>
                </SimpleTooltip>
              );
            })}
          </div>
        </div>
        <div className="p-2 flex flex-1 items-stretch flex-col">
          {tabId ? (
            children({ tabId })
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
