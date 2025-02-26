import { useState } from "react";
import { DraggableTabs, Tab } from "../ext/draggable-tabs";
import { cn } from "@/lib/utils";
import { css } from "goober";

const nav = {
  active: "due",
  tabs: [
    { id: "active", label: "Active", closable: false },
    { id: "due", label: "Dua" },
  ] as Tab[],
};

export const ModelNavTabs = () => {
  const render = useState({})[1];
  return (
    <div className="flex relative items-stretch flex-col">
      <div className="h-[40px] border-b border-[#ececeb]"></div>
      <DraggableTabs
        activeTab={nav.active}
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
              color: #165dfb;
              border: 1px solid #ececeb;
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
