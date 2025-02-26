import { useLocal } from "@/hooks/use-local";
import { cn } from "@/lib/utils";
import { FC, ReactNode } from "react";
import { ModelName, Models } from "shared/types";
import { DetailTab, LayoutDetail } from "system/model/layout/types";

export const MDetailTabs: FC<{
  model: Models[keyof Models];
  detail: LayoutDetail<ModelName>;
  children: (arg: { activeTab: DetailTab<ModelName> }) => ReactNode;
}> = ({ children, detail }) => {
  const local = useLocal({
    idx: 0,
  });

  return (
    <div className="flex flex-col flex-1">
      <div className="border-b border-b-sidebar-border h-[35px] flex items-end px-3 space-x-3">
        {detail.tabs.map((e, idx) => {
          let id = "";
          if (e.type === "relation") {
            id = e.name;
          } else if (e.type === "jsx") {
            id = "jsx_" + idx;
          }

          return (
            <div
              className={cn(
                "text-[13px] h-[34px] transition-all flex items-center cursor-pointer px-[2px]",
                idx === local.idx
                  ? "border-b border-ring font-semibold text-ring -mb-[1px]"
                  : "opacity-50"
              )}
              onClick={() => {
                local.idx = idx;
                local.render();
              }}
              key={idx}
            >
              {e.title}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col p-3">
        {children({ activeTab: detail.tabs[local.idx] })}
      </div>
    </div>
  );
};
