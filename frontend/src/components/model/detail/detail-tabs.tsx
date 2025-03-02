import { WarnFull } from "@/components/app/warn-full";
import { SimpleTooltip } from "@/components/ext/simple-tooltip";
import { useValtioTab } from "@/hooks/use-valtio-tab";
import { useReader, useWriter } from "@/hooks/use-read-write";
import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";
import { FC, ReactNode } from "react";
import { ModelName, Models } from "shared/types";
import { DetailTab, LayoutDetail } from "system/model/layout/types";

type TabWriter = {
  idx: number;
  unsavedTabs: Record<number, any>;
};

export const MDetailTabs: FC<{
  model: Models[keyof Models];
  tab: ReturnType<typeof useValtioTab>;
  children: (arg: {
    activeTab: DetailTab<ModelName>;
    writer: TabWriter;
    reader: TabWriter;
  }) => ReactNode;
}> = ({ children, tab }) => {
  const writer = useWriter({
    idx: 0,
    unsavedTabs: {},
  } as TabWriter);
  const reader = useReader(writer);

  if (!tab.config?.layout?.detail?.default) return null;
  
  const detail = tab.config?.layout?.detail?.default;
  if (!detail) return null;

  if (tab.status === "ready" && !tab.detail?.data)
    return (
      <WarnFull size={35} className="py-[50px]">
        Data Tidak Ditemukan
      </WarnFull>
    );

  return (
    <div className="flex flex-col flex-1 select-none">
      <Tabs detail={detail} writer={writer} />
      <div className="flex flex-col p-3">
        {children({
          activeTab: detail?.tabs[reader.idx],
          writer,
          reader,
        })}
      </div>
    </div>
  );
};

const Tabs: FC<{
  detail: LayoutDetail<ModelName>;
  writer: TabWriter;
}> = ({ detail, writer }) => {
  const reader = useReader(writer);
  const activeIdx = reader.idx;
  const unsavedTabs = reader.unsavedTabs;
  return (
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
              idx === activeIdx
                ? cn(
                    unsavedTabs[idx]
                      ? "text-red-500 border-red-500"
                      : "border-ring text-ring",
                    "border-b  font-semibold  -mb-[1px]"
                  )
                : cn(
                    unsavedTabs[idx]
                      ? "text-red-500 border-red-500 border-b -mb-[1px]"
                      : "",
                    "opacity-50"
                  )
            )}
            onClick={() => {
              writer.idx = idx;
            }}
            key={idx}
          >
            <>
              {unsavedTabs[idx] ? (
                <SimpleTooltip content="Belum disimpan" delay={300}>
                  <div className="flex items-center">
                    {e.title}
                    <div className="text-red-500 ml-1">
                      <TriangleAlert size="12" />
                    </div>
                  </div>
                </SimpleTooltip>
              ) : (
                <>{e.title} </>
              )}
            </>
          </div>
        );
      })}
    </div>
  );
};
