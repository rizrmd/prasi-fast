import { useModel } from "@/hooks/use-model";
import { navigate, parseRouteParams, useRouter } from "@/lib/router";
import { cn } from "@/lib/utils";
import { css } from "goober";
import { FC, useEffect, useState, useRef } from "react";
import { ModelName } from "shared/types";
import { DraggableTabs, Tab } from "../ext/draggable-tabs";
import * as Models from "shared/models";
import cuid from "@bugsnag/cuid";

const STORAGE_KEY = "nav_tabs_state";

// Track tabs that are currently loading labels
const loadingLabels = new Set<string>();

// Centralized function for fetching and updating tab labels
const updateTabLabel = async (tab: Tab, modelName: ModelName, id: string) => {
  if (!tab || loadingLabels.has(tab.id)) return;
  
  try {
    loadingLabels.add(tab.id);
    tab.label = `${modelName}${tab.label?.includes('…') ? '…' : ''}`;
    nav.render();

    const model = Models[modelName];
    if (!model) {
      console.warn(`Model ${modelName} not found`);
      return;
    }

    const data = await model.findFirst(id);
    if (data) {
      const title = model.title(data);
      const tabIndex = getTabIndexById(tab.id);
      
      // Check if tab still exists before updating
      if (tabIndex >= 0) {
        tab.label = `${modelName}: ${
          title.length > 7 ? `${title.substring(0, 7)}…` : title
        }`;
        nav.saveState();
        nav.render();
      }
    }
  } catch (error) {
    console.error(`Failed to update label for tab ${tab.id}:`, error);
  } finally {
    loadingLabels.delete(tab.id);
  }
};

type NavType = {
  activeIdx: number;
  tabs: Tab[];
};
const nav = {
  activeIdx: 0,
  tabs: [] as Tab[],
  render: () => {},

  // Save current state to localStorage
  saveState: () => {
    try {
      // Only save if we have valid tabs
      if (nav.tabs && nav.tabs.length > 0) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            activeIdx: nav.activeIdx,
            tabs: nav.tabs,
          })
        );
      }
    } catch (e) {
      console.error("Failed to save tabs state:", e);
    }
  },

  // Load state from localStorage
  loadState: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as NavType;

        // Validate the structure of loaded data
        if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
          // Ensure all tabs have required properties
          const validTabs = parsed.tabs.filter(
            (tab) =>
              tab &&
              typeof tab.id === "string" &&
              typeof tab.url === "string" &&
              typeof tab.label === "string"
          );

          if (validTabs.length > 0) {
            nav.tabs = validTabs;

            // Validate activeIdx
            const activeIdxIsValid =
              typeof parsed.activeIdx === "number" &&
              parsed.activeIdx >= 0 &&
              parsed.activeIdx < validTabs.length;

            nav.activeIdx = activeIdxIsValid ? parsed.activeIdx : 0;
            return true;
          }
        }
      }
      return false;
    } catch (e) {
      console.error("Failed to load tabs state:", e);
      return false;
    }
  },
};

// Helper function to get tab index by ID
const getTabIndexById = (id: string): number => {
  return nav.tabs.findIndex((tab) => tab.id === id);
};

// Find tab index by URL
const findTabIndexByUrl = (url: string): number => {
  return nav.tabs.findIndex((tab) => tab.url === url);
};

// Helper function to get tab by ID
const getTabById = (id: string): Tab | undefined => {
  return nav.tabs.find((tab) => tab.id === id);
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
      label: `${modelName}...`, // Add ellipsis to indicate loading
    };
    nav.tabs.push(tab);
    nav.saveState();
    nav.render();
    
    if (params.id && !["new", "clone"].includes(params.id)) {
      updateTabLabel(tab, modelName, params.id);
    }
  }
};

export const ModelNavTabs: FC<{ modelName: ModelName }> = ({ modelName }) => {
  const model = useModel({ modelName });
  const render = useState({})[1];
  const { currentPath, params } = useRouter();
  const initializedRef = useRef(false);
  nav.render = () => render({});

  // Load saved tabs on component mount - only run once
  useEffect(() => {
    if (!initializedRef.current && nav.tabs.length === 0) {
      initializedRef.current = true;
      const loaded = nav.loadState();

      if (loaded && nav.tabs.length > 0) {
        // Check if current URL matches any tab
        const currentTabIndex = findTabIndexByUrl(currentPath);

        if (currentTabIndex >= 0) {
          // Current URL already matches a tab, activate it
          nav.activeIdx = currentTabIndex;
          nav.saveState();
          render({});
        } else {
          // Navigate to the active tab
          const activeTab = nav.tabs[nav.activeIdx];
          if (activeTab && activeTab.url && activeTab.url !== currentPath) {
            // Use setTimeout to defer navigation until after component mount
            setTimeout(() => {
              navigate(activeTab.url);
            }, 0);
          }
        }
      }
    }
  }, [currentPath]);

  useEffect(() => {
    const updateActive = () => {
      // Check if there's an existing tab for this URL
      const tabIndex = findTabIndexByUrl(currentPath);

      if (tabIndex >= 0) {
        // We found a matching tab, make it active
        nav.activeIdx = tabIndex;
        const found = nav.tabs[tabIndex];
        if (!found.label) found.label = modelName;

        if (params.id && !["new", "clone"].includes(params.id)) {
          updateTabLabel(found, modelName, params.id);
        }
        nav.saveState();
        return true;
      } else if (nav.tabs.length > 0) {
        // Update the current active tab
        const found = nav.tabs[nav.activeIdx];
        if (found) {
          found.url = currentPath;
          found.label = modelName;

          if (params.id && !["new", "clone"].includes(params.id)) {
            updateTabLabel(found, modelName, params.id);
          }
          nav.saveState();
          return true;
        }
      }

      return false;
    };

    if (!updateActive()) {
      if (nav.tabs.length === 0) {
        const newTab = { id: cuid(), url: currentPath, label: modelName };
        nav.tabs.push(newTab);
        nav.activeIdx = 0;
        nav.saveState();
        render({});
        
        if (params.id && !["new", "clone"].includes(params.id)) {
          updateTabLabel(newTab, modelName, params.id);
        }
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
        activeIndex={nav.activeIdx}
        tabs={nav.tabs}
        onTabChange={(index) => {
          if (index >= 0 && index < nav.tabs.length) {
            nav.activeIdx = index;
            const tab = nav.tabs[index];
            if (tab && tab.url) {
              navigate(tab.url);
            }
            nav.saveState();
            render({});
          }
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
          if (idx >= 0) {
            nav.tabs = nav.tabs.filter((t) => t.id !== tabId);

            // If we're closing the active tab, switch to another one
            if (nav.activeIdx === idx) {
              nav.activeIdx = idx === 0 ? 0 : idx - 1;
              // If there are no tabs left, set to 0
              if (nav.tabs.length === 0) {
                nav.activeIdx = 0;
              } else {
                // Navigate to the new active tab
                const newActiveTab = nav.tabs[nav.activeIdx];
                if (newActiveTab && newActiveTab.url) {
                  navigate(newActiveTab.url);
                }
              }
            } else if (nav.activeIdx > idx) {
              // If the closed tab was before the active one, adjust the index
              nav.activeIdx--;
            }

            nav.saveState();
            render({});
          }
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

          nav.saveState();
          render({});
        }}
      />
    </div>
  );
};
