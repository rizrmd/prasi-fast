import { navigate, useRouter, parseRouteParams } from "@/lib/router";
import * as Models from "shared/models";
import { cn } from "@/lib/utils";
import cuid from "@bugsnag/cuid";
import { css } from "goober";
import { FC, useEffect, useState, useCallback, useRef } from "react";
import { DraggableTabs } from "../ext/draggable-tabs";
import { ModelName } from "shared/types";
import { nav } from "./nav/types";
import {
  findTabIndexByUrl,
  getTabIndexById,
  loadLabel,
  saveNavState,
} from "./nav/utils";

// Debounce function to prevent excessive operations
const debounce = <T extends (...args: any[]) => any>(fn: T, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

export const ModelNavTabs: FC<{ modelName: ModelName }> = ({ modelName }) => {
  const render = useState({})[1];
  const { currentFullPath } = useRouter();
  const currentPath = currentFullPath;
  const isNavigating = useRef(false);
  
  // Replace direct assignment with a function to avoid race conditions
  nav.render = useCallback(() => {
    if (!isNavigating.current) {
      render({});
    }
  }, [render]);

  // Debounced version of saveNavState to prevent excessive localStorage writes
  const debouncedSaveNavState = useCallback(
    debounce(() => {
      saveNavState();
    }, 200),
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (nav.show && nav.tabs.length <= 1) {
        nav.show = false;
        nav.render();
      } else if (!nav.show && nav.tabs.length > 1) {
        nav.show = true;
        nav.render();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [nav.tabs.length]);

  // Handle URL changes after initial load
  useEffect(() => {
    if (nav.tabs.length === 0 || !modelName) return;

    const currentTab = nav.tabs[nav.activeIdx];
    if (currentTab && !currentTab.label.includes("⚠")) {
      // Prevent updating the tab if we're already on the correct URL
      if (currentTab.url === currentPath) return;
      
      loadLabel(currentPath).then((label) => {
        currentTab.url = currentPath;
        currentTab.label = label || modelName;
        debouncedSaveNavState();
        nav.render();
      });
    }
  }, [currentPath, modelName, debouncedSaveNavState]);

  // Load saved tabs on component mount - only run once
  useEffect(() => {
    if (nav.tabs.length > 0) return;

    // Load from localStorage
    let storedNav = null;
    try {
      const savedData = localStorage.getItem("nav_tabs_state");
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
        const newTab = {
          id: cuid(),
          url: currentPath,
          label: modelName || "Not Found ⚠",
          closable: true,
        };
        nav.tabs.unshift(newTab);
        nav.activeIdx = 0;
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

    debouncedSaveNavState();
    nav.render();
  }, [currentPath, modelName, debouncedSaveNavState]);

  // Optimized tab change handler
  const handleTabChange = useCallback((index: number) => {
    if (nav.activeIdx === index) return; // Skip if already on this tab
    
    isNavigating.current = true;
    nav.activeIdx = index;
    debouncedSaveNavState();
    
    const targetUrl = nav.tabs[index].url;
    navigate(targetUrl);
    
    // Reset the navigating flag after navigation completes
    setTimeout(() => {
      isNavigating.current = false;
      nav.render();
    }, 100);
  }, [debouncedSaveNavState]);

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
        onTabChange={handleTabChange}
        onTabClose={(tabId) => {
          const tabIndex = getTabIndexById(tabId);
          if (tabIndex !== -1) {
            // Remove the tab
            nav.tabs.splice(tabIndex, 1);

            // Update active index if needed
            if (nav.tabs.length === 0) {
              // No tabs left, navigate to home
              navigate("/");
            } else if (tabIndex <= nav.activeIdx) {
              // If we removed a tab before or at the active index
              nav.activeIdx = Math.max(0, nav.activeIdx - 1);
              // Navigate to the new active tab
              navigate(nav.tabs[nav.activeIdx].url);
            }

            debouncedSaveNavState();
            nav.render();
          }
        }}
        onTabsReorder={(tabs) => {
          nav.tabs = tabs;
          debouncedSaveNavState();
          nav.render();
        }}
      />
    </div>
  );
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
    const newTab = {
      id: cuid(),
      url,
      label: modelName,
      closable: true,
    };

    // Check if tab with this URL already exists
    const existingTabIndex = findTabIndexByUrl(url);
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

    saveNavState();
    nav.render();
  }
};
