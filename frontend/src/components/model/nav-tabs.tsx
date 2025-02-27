import { useModel } from "@/hooks/use-model";
import { navigate, parseRouteParams, useRouter } from "@/lib/router";
import { cn } from "@/lib/utils";
import cuid from "@bugsnag/cuid";
import { css } from "goober";
import { FC, useEffect, useState } from "react";
import * as Models from "shared/models";
import { ModelName } from "shared/types";
import { DraggableTabs, Tab as DraggableTabType } from "../ext/draggable-tabs";

const STORAGE_KEY = "nav_tabs_state";

type NavType = {
  activeIdx: number;
  tabs: DraggableTabType[];
};
const nav = {
  activeIdx: 0,
  show: false,
  tabs: [] as DraggableTabType[],
  render: () => {},
};

export const ModelNavTabs: FC<{ modelName: ModelName }> = ({ modelName }) => {
  const render = useState({})[1];
  const { currentPath, params } = useRouter();
  nav.render = () => render({});

  useEffect(() => {
    setTimeout(() => {
      if (nav.show && nav.tabs.length <= 1) {
        nav.show = false;
        nav.render();
      } else if (!nav.show && nav.tabs.length > 1) {
        nav.show = true;
        nav.render();
      }
    }, 100);
  }, [nav.tabs.length]);

  const loadLabel = async (url: string) => {
    const params = parseRouteParams(url);
    const modelName = Object.keys(Models).find(
      (key) => key.toLowerCase() === params?.name.toLowerCase()
    ) as ModelName;

    if (params && modelName && params.id) {
      const model = Models[modelName];

      if (model) {
        const data = await model.findFirst(params.id);
        if (data) {
          const title = model.title(data);
          return `${modelName}: ${
            title.length > 7 ? title.substring(0, 7) + "..." : title
          }`;
        }
      }
      return modelName;
    }
  };
  // Handle URL changes after initial load
  useEffect(() => {
    if (nav.tabs.length === 0) return;

    const currentTab = nav.tabs[nav.activeIdx];
    if (currentTab) {
      loadLabel(currentPath).then((label) => {
        currentTab.url = currentPath;
        currentTab.label = label || modelName;
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ activeIdx: nav.activeIdx, tabs: nav.tabs })
        );
        nav.render();
      });
    }
  }, [currentPath]);

  // Load saved tabs on component mount - only run once
  useEffect(() => {
    if (nav.tabs.length > 0) return;

    // Load from localStorage
    let storedNav: NavType | null = null;
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        storedNav = JSON.parse(savedData);
      }
    } catch (e) {
      console.error("Failed to parse nav_tabs_state from localStorage", e);
    }

    if (
      storedNav &&
      Array.isArray(storedNav.tabs) &&
      storedNav.tabs.length > 0
    ) {
      nav.tabs = storedNav.tabs;
      nav.activeIdx =
        typeof storedNav.activeIdx === "number" ? storedNav.activeIdx : 0;

      // Find and activate tab for current URL
      const currentTabIndex = findTabIndexByUrl(currentPath);
      if (currentTabIndex !== -1) {
        nav.activeIdx = currentTabIndex;
      } else {
        // Create new tab for current URL
        const newTab: DraggableTabType = {
          id: cuid(),
          url: currentPath,
          label: modelName,
          closable: true,
        };
        nav.tabs.push(newTab);
        nav.activeIdx = nav.tabs.length - 1;
      }
    } else {
      // Initialize with current URL as first tab
      nav.tabs = [
        {
          id: cuid(),
          url: currentPath,
          label: modelName,
          closable: true,
        },
      ];
      nav.activeIdx = 0;
    }

    // Save initial state
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeIdx: nav.activeIdx, tabs: nav.tabs })
    );
    nav.render();
  }, []);

  return (
    <div className="flex relative items-stretch flex-col overflow-hidden">
      <div
        className={cn(
          "border-b border-sidebar-border transition-all",
          nav.show ? "h-[40px]" : "h-0"
        )}
      ></div>
      <DraggableTabs
        activeIndex={nav.activeIdx}
        tabs={nav.tabs}
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
        onTabChange={(index) => {
          console.log("on Tab Change");
          nav.activeIdx = index;
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ activeIdx: nav.activeIdx, tabs: nav.tabs })
          );
          navigate(nav.tabs[index].url);
          nav.render();
        }}
        onTabClose={(tabId) => {
          const tabIndex = getTabIndexById(tabId);
          if (tabIndex !== -1) {
            // Remove the tab
            nav.tabs.splice(tabIndex, 1);

            // Update active index if needed
            if (nav.tabs.length === 0) {
              // No tabs left, navigate to home or create a new tab
              // This depends on your application's behavior
              navigate("/");
            } else if (tabIndex <= nav.activeIdx) {
              // If we removed a tab before or at the active index
              nav.activeIdx = Math.max(0, nav.activeIdx - 1);
              // Navigate to the new active tab
              navigate(nav.tabs[nav.activeIdx].url);
            }

            // Save updated tabs state to localStorage
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({
                activeIdx: nav.activeIdx,
                tabs: nav.tabs,
              })
            );

            // Update UI
            nav.render();
          }
        }}
        onTabsReorder={(tabs) => {
          nav.tabs = tabs;
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ activeIdx: nav.activeIdx, tabs: nav.tabs })
          );
          nav.render();
        }}
      />
    </div>
  );
};

// Helper function to get tab index by ID
const getTabIndexById = (id: string): number => {
  return nav.tabs.findIndex((tab) => tab.id === id);
};

// Find tab index by URL
const findTabIndexByUrl = (url: string): number => {
  return nav.tabs.findIndex((tab) => tab.url === url);
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
    const newTab: DraggableTabType = {
      id: cuid(),
      url,
      label: modelName,
      closable: true,
    };

    // Check if tab with this URL already exists
    const existingTabIndex = nav.tabs.findIndex((tab) => tab.url === url);
    if (existingTabIndex !== -1) {
      if (opt?.activate !== false) {
        nav.activeIdx = existingTabIndex;
        navigate(url);
      }
    } else {
      nav.tabs.push(newTab);
      if (opt?.activate !== false) {
        nav.activeIdx = nav.tabs.length - 1;
        navigate(url);
      }
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeIdx: nav.activeIdx,
        tabs: nav.tabs,
      })
    );
    nav.render();
  }
};
