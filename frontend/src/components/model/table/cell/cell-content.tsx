import { cn } from "@/lib/utils";
import { forwardRef, ForwardedRef } from "react";

interface CellContentProps {
  type: string;
  value?: any;
  isActive: boolean;
}

export const CellContent = forwardRef<HTMLDivElement, CellContentProps>(
  ({ type, value, isActive }, ref) => {
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
        {type === "hasMany" ? (
          <>{Array.isArray(value) ? value?.length : "0 items"}</>
        ) : (
          value
        )}
      </div>
    );
  }
);

// Add display name for better debugging
CellContent.displayName = "CellContent";