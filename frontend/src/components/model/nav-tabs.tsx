import { useModel } from "@/hooks/use-model";
import { useRouter } from "@/lib/router";
import { cn } from "@/lib/utils";
import { css } from "goober";
import { FC, useEffect, useState } from "react";
import { ModelName } from "shared/types";
import { DraggableTabs, Tab } from "../ext/draggable-tabs";

const nav = {
  active: "",
  tabs: [] as Tab[],
};

export const openInNewTab = (url: string, opt?: { activate?: boolean }) => {
  nav.tabs.push({ id: url, label: "New Tab" });
};

export const ModelNavTabs: FC<{ modelName: ModelName }> = ({ modelName }) => {
  const model = useModel({ modelName });
  const render = useState({})[1];
  const { currentPath, params } = useRouter();
  useEffect(() => {
    const getLabel = async () => {
      const instance = model.instance;
      if (instance) {
        const data = await instance.findFirst(params.id);
        if (data) {
          const title = instance.title(data);
          return `${modelName}: ${
            title.length > 7 ? `${title.substring(0, 7)}…` : title
          }`;
        }
      }
      return modelName;
    };

    const updateActive = () => {
      const found = nav.tabs.find((e) => e.id === nav.active);
      if (found) {
        found.id = currentPath;
        found.label = modelName;
        nav.active = currentPath;
        if (params.id && !["new", "clone"].includes(params.id)) {
          getLabel().then((label) => {
            found.label = label;
            render({});
          });
        }
      }
      return found;
    };

    if (!updateActive()) {
      if (nav.tabs.length === 0) {
        nav.tabs.push({ id: currentPath, label: modelName });
        nav.active = currentPath;
        render({});
        updateActive();
      }
    }
  }, [currentPath, modelName, params.id, model]);

  if (nav.tabs.length <= 1) return null;

  return (
    <div className="flex relative items-stretch flex-col">
      <div className="h-[40px] border-b border-sidebar-border"></div>
      <DraggableTabs
        activeTab={nav.active || currentPath}
        tabs={nav.tabs}
        onTabChange={(tab) => {
          nav.active = tab;
          render({});
        }}
        className={cn(
          "bg-transparent pb-0 pt-0 items-end absolute left-0 top-0 right-0 z-10",
          css`
            .tab-item {
              border: 1px solid transparent;
              border-bottom: 0;
              position: absolute;
              cursor: pointer;
            }
            .tab-item[data-state="active"] {
              background: white;
              box-shadow: none !important;
              border-bottom-left-radius: 0;
              border-bottom-right-radius: 0;
              color: var(--ring);
              border: 1px solid var(--sidebar-border);
              border-bottom: 0;
            }
          `
        )}
        onTabClose={(tabId) => {
          const idx = nav.tabs.findIndex((t) => t.id === tabId);
          nav.tabs = nav.tabs.filter((t) => t.id !== tabId);
          if (nav.active === tabId) {
            nav.active = nav.tabs[idx === 0 ? nav.tabs.length - 1 : idx - 1].id;
          }
          render({});
        }}
        onTabsReorder={(tabs) => {
          nav.tabs = tabs;
          render({});
        }}
      />
    </div>
  );
};
