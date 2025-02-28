import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import { FC, forwardRef, ForwardRefRenderFunction } from "react";

interface ModelTableHeadTitleProps {
  title: string;
  sortBy?: "asc" | "desc";
  filterCount?: number;
  isOpen: boolean;
  colIdx: number;
  className?: string;
  onClick: () => void;
}

const ModelTableHeadTitleComponent: ForwardRefRenderFunction<
  HTMLDivElement,
  ModelTableHeadTitleProps
> = (
  { title, sortBy, filterCount, isOpen, colIdx, className, onClick },
  ref
) => {
  return (
    <div
      ref={ref}
      className={cn(
        "w-full h-full flex px-2 min-h-[40px] items-center border-r border-transparent cursor-pointer transition-all relative justify-between group",
        className,
        colIdx === 0 && "rounded-tl-md",
        colIdx > 0 && "border-l",
        isOpen
          ? "border-gray-200 bg-blue-100 outline-primary"
          : "hover:border-gray-200 hover:bg-blue-50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center">
        {sortBy === "asc" && <ArrowUp className="mr-1" size={14} />}
        {sortBy === "desc" && <ArrowDown className="mr-1" size={14} />}
        <div>{title}</div>
        {filterCount !== undefined && filterCount > 0 && (
          <Badge className="ml-2 py-0">{filterCount}</Badge>
        )}
      </div>
      <ChevronDown
        className={cn(
          "chevron transition-all absolute right-2 group-hover:opacity-60",
          isOpen ? "opacity-60" : "opacity-0"
        )}
        size={20}
      />
    </div>
  );
};

export const ModelTableHeadTitle = forwardRef(ModelTableHeadTitleComponent);
