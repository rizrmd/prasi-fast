import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { css } from "goober";

export interface Tab {
  id: string;
  label: string;
  url: string;
  pinned?: boolean;
  closable?: boolean;
}

interface DraggableTabProps {
  tab: Tab;
  tabLength: number;
  onClose: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  onCloseOthers?: () => void;
  onCloseRight?: () => void;
  isDragging?: boolean;
  closable?: boolean;
  onSelect?: () => void;
}

const restrictToHorizontalAxis: Modifier = ({ transform }) => {
  return {
    ...transform,
    y: 0,
    x: transform.x,
    scaleX: 1,
    scaleY: 1,
  };
};

const DraggableTab = ({
  tab,
  tabLength,
  onClose,
  onPin,
  onUnpin,
  onCloseOthers,
  onCloseRight,
  isDragging,
  onSelect,
}: DraggableTabProps) => {
  const [rightClick, setRightClick] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const {
    attributes,
    listeners,
    transform,
    transition,
    setNodeRef,
    isDragging: isSortableNodeDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(
      transform
        ? {
            x: transform.x,
            y: 0,
            scaleX: 1,
            scaleY: 1,
          }
        : {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
          }
    ),
    transition,
    position: "relative" as const,
    zIndex: isDragging ? 1 : 0,
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
  };

  return (
    <TabsTrigger
      ref={setNodeRef}
      value={tab.id}
      style={style}
      className={cn(
        `relative cursor-pointer select-none group flex items-center `,
        isDragging
          ? css`
              pointer-events: none;
              border: 1px solid #8ec6ff !important;
              background: #eff6ff !important;
              border-bottom: 0 !important;
            `
          : ""
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={onSelect}
      {...attributes}
      {...(rightClick ? {} : listeners)}
    >
      <ContextMenu
        onOpenChange={(open) => {
          setRightClick(open);
        }}
      >
        <ContextMenuTrigger asChild>
          <div className={cn("flex items-center")}>
            {tab.pinned && (
              <Pin size={14} className="mr-1 text-muted-foreground" />
            )}
            <span>{tab.label}</span>
            {!tab.pinned && tab.closable !== false && tabLength > 1 && (
              <span
                role="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setClosing(true);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  setClosing(false);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className={cn(
                  "p-[2px] ml-1 -mr-2 rounded-full cursor-pointer close-tab",
                  closing ? "bg-slate-100" : "hover:bg-slate-300"
                )}
              >
                <X size={14} />
              </span>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent
          onContextMenu={(e) => {
            e.preventDefault();
          }}
        >
          <ContextMenuItem onPointerDown={onClose}>Close Tab</ContextMenuItem>
          {onCloseOthers && (
            <ContextMenuItem onPointerDown={onCloseOthers}>
              Close Other Tabs
            </ContextMenuItem>
          )}
          {onCloseRight && (
            <ContextMenuItem onPointerDown={onCloseRight}>
              Close Tabs to the Right
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          {!tab.pinned && onPin && (
            <ContextMenuItem onPointerDown={onPin}>
              <Pin size={14} className="mr-2" />
              Pin Tab
            </ContextMenuItem>
          )}
          {tab.pinned && onUnpin && (
            <ContextMenuItem onClick={onUnpin}>
              <PinOff size={14} className="mr-2" />
              Unpin Tab
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </TabsTrigger>
  );
};

interface DraggableTabsProps {
  tabs: Tab[];
  activeIndex: number;
  onTabChange: (index: number) => void;
  onTabsReorder: (tabs: Tab[]) => void;
  onTabClose: (tabId: string) => void;
  className?: string;
}

export const DraggableTabs = ({
  tabs,
  activeIndex,
  onTabChange,
  onTabsReorder,
  onTabClose,
  className,
}: DraggableTabsProps) => {
  const [draggedTab, setDraggedTab] = React.useState<Tab | null>(null);

  // Single declaration of activeTabIdRef
  const activeTabIdRef = React.useRef<string | null>(
    tabs[activeIndex]?.id || null
  );

  // Add a flag to track when a tab is being closed
  const [isClosingTab, setIsClosingTab] = React.useState(false);

  // Update activeTabIdRef when activeIndex changes
  React.useEffect(() => {
    if (tabs[activeIndex]) {
      activeTabIdRef.current = tabs[activeIndex].id;
    }
  }, [activeIndex, tabs]);

  const handleCloseOthers = (tabId: string) => {
    const newTabs = tabs.filter((t) => t.id === tabId || t.pinned);
    onTabsReorder(newTabs);
  };

  const handleCloseRight = (tabId: string) => {
    const index = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t, i) => i <= index || t.pinned);
    onTabsReorder(newTabs);
  };

  const handlePinTab = (tabId: string) => {
    const newTabs = tabs.map((t) =>
      t.id === tabId ? { ...t, pinned: true } : t
    );
    onTabsReorder(newTabs);
  };

  const handleUnpinTab = (tabId: string) => {
    const newTabs = tabs.map((t) =>
      t.id === tabId ? { ...t, pinned: false } : t
    );
    onTabsReorder(newTabs);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
        tolerance: 5,
        delay: 50,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    setDraggedTab(tabs.find((tab) => tab.id === active.id) || null);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
      const newIndex = tabs.findIndex((tab) => tab.id === over.id);
      const newTabs = arrayMove(tabs, oldIndex, newIndex);
      onTabsReorder(newTabs);
      onTabChange(newIndex);
    }
    setDraggedTab(null);
  };

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0.4",
        },
      },
    }),
  };

  // Handle tab closing with debounce to prevent unwanted tab change events
  const handleTabClose = (tabId: string) => {
    setIsClosingTab(true);
    onTabClose(tabId);

    // Reset the closing flag after a short delay
    setTimeout(() => {
      setIsClosingTab(false);
    }, 100);
  };

  return (
    <Tabs value={tabs[activeIndex]?.id}>
      <TabsList
        className={cn(
          "flex w-full mx-auto overflow-x-auto overflow-y-hidden rounded-none",
          className,
          draggedTab &&
            css`
              .close-tab {
                pointer-events: none;
              }
            `
        )}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragMove={(event) => {
            if (!draggedTab) {
              handleDragStart(event);
            }
          }}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToHorizontalAxis]}
        >
          <SortableContext
            items={tabs.map((tab) => tab.id)}
            strategy={horizontalListSortingStrategy}
          >
            {[...tabs]
              .sort((a, b) => {
                // Sort pinned tabs first
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return 0;
              })
              .map((tab, idx) => (
                <DraggableTab
                  key={tab.id}
                  tabLength={tabs.length}
                  tab={tab}
                  onClose={() => {
                    handleTabClose(tab.id);
                  }}
                  onCloseOthers={() => handleCloseOthers(tab.id)}
                  onCloseRight={() => handleCloseRight(tab.id)}
                  onPin={() => handlePinTab(tab.id)}
                  onUnpin={() => handleUnpinTab(tab.id)}
                  onSelect={() => {
                    onTabChange(idx);
                  }}
                />
              ))}
          </SortableContext>
          <DragOverlay
            dropAnimation={dropAnimation}
            modifiers={[restrictToHorizontalAxis]}
            className="cursor-pointer pointer-events-none"
          >
            {draggedTab ? (
              <DraggableTab
                tab={draggedTab}
                tabLength={tabs.length}
                onClose={() => handleTabClose(draggedTab.id)}
                isDragging={true}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </TabsList>
    </Tabs>
  );
};
