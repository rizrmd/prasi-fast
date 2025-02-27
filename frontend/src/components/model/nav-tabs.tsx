import { useModel } from "@/hooks/use-model";
import { parseRouteParams, useRouter } from "@/lib/router";
import { cn } from "@/lib/utils";
import { css } from "goober";
import { FC, useEffect, useState } from "react";
import { ModelName } from "shared/types";
import { DraggableTabs, Tab } from "../ext/draggable-tabs";
import * as Models from "shared/models";
import cuid from "@bugsnag/cuid";
const nav = {
  activeIdx: 0, // This is now consistently a numeric index
  tabs: [] as Tab[],
  render: () => {},
};

// Helper function to get tab index by ID
const getTabIndexById = (id: string): number => {
  return nav.tabs.findIndex((tab) => tab.id === id);
};

export const openInNewTab = async (
  url: string,
  opt?: { activate?: boolean }
) => {
  const params = parseRouteParams(url);

  const modelName = Object.keys(Models).find(
    (key) => key.toLowerCase() === params?.name.toLowerCase()
  ) as ModelName;
  if (modelName && params) {
    const tab = {
      id: cuid(),
      url,
      label: modelName as string,
    };
    nav.tabs.push(tab);
    nav.render();
    const model = Models[modelName];
    const data = await model.findFirst(params.id);
    if (data) {
      const title = model.title(data);
      tab.label = `${modelName}: ${
        title.length > 7 ? `${title.substring(0, 7)}…` : title
      }`;
      nav.render();
    }
  }
};

export const ModelNavTabs: FC<{ modelName: ModelName }> = ({ modelName }) => {
  const model = useModel({ modelName });
  const render = useState({})[1];
  const { currentPath, params } = useRouter();
  nav.render = () => render({});

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
      // Find the tab with the current path
      const found = nav.tabs[nav.activeIdx];

      if (found) {
        found.label = modelName;
        found.url = currentPath;

        if (params.id && !["new", "clone"].includes(params.id)) {
          getLabel().then((label) => {
            const found = nav.tabs[nav.activeIdx];
            found.label = label;
            render({});
          });
        }
      }
      return found;
    };

    if (!updateActive()) {
      if (nav.tabs.length === 0) {
        nav.tabs.push({ id: cuid(), url: currentPath, label: modelName });
        nav.activeIdx = 0; // Set to index 0, not the path
        render({});
        updateActive();
      }
    }
  }, [currentPath, modelName, params.id, model]);

  return (
    <div className="flex relative items-stretch flex-col overflow-hidden">
      <div
        className={cn(
          "border-b border-sidebar-border transition-all",
          nav.tabs.length > 1 ? "h-[40px]" : "h-0"
        )}
      ></div>
      <DraggableTabs
        activeIndex={nav.activeIdx} // Use activeIndex instead of activeIdx
        tabs={nav.tabs}
        onTabChange={(index) => {
          // Now receives an index, not an ID
          nav.activeIdx = index;
          // Navigate to the tab URL
          const tabId = nav.tabs[index]?.id;
          if (tabId) {
            // Add navigation logic here if needed
          }
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
          const idx = getTabIndexById(tabId);
          nav.tabs = nav.tabs.filter((t) => t.id !== tabId);

          // If we're closing the active tab, switch to another one
          if (nav.activeIdx === idx) {
            nav.activeIdx = idx === 0 ? 0 : idx - 1;
            // If there are no tabs left, set to 0
            if (nav.tabs.length === 0) {
              nav.activeIdx = 0;
            }
          } else if (nav.activeIdx > idx) {
            // If the closed tab was before the active one, adjust the index
            nav.activeIdx--;
          }

          render({});
        }}
        onTabsReorder={(tabs) => {
          // Find the current active tab by ID
          const activeTabId = nav.tabs[nav.activeIdx]?.id;

          // Update tabs
          nav.tabs = tabs;

          // Update active index based on the new position
          if (activeTabId) {
            nav.activeIdx = getTabIndexById(activeTabId);
          }

          render({});
        }}
      />
    </div>
  );
};
