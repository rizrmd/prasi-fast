import { cn } from "@/lib/utils";
import { forwardRef, ForwardedRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface CellContentProps {
  type: string;
  value?: any;
  isActive: boolean;
  loading?: boolean;
}

export const CellContent = forwardRef<HTMLDivElement, CellContentProps>(
  ({ type, value, isActive, loading = false }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "px-2 cursor-pointer -ml-2 border transition-all rounded-full select-none",
          isActive
            ? "bg-blue-50 border-blue-300 text-blue-600"
            : "hover:border-slate-300 hover:bg-white border-transparent"
        )}
      >
        {loading ? <Skeleton className="h-4 w-16" /> : value}
      </div>
    );
  }
);

// Add display name for better debugging
CellContent.displayName = "CellContent";
