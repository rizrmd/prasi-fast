import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { css } from "goober";
import { FC, ReactElement } from "react";

export const ModelToolbar: FC<{
  left?: ReactElement;
  right?: ReactElement;
}> = ({ left, right }) => {
  return (
    <div
      className={cn(
        "rounded-md rounded-t-none border-sidebar-border border bg-sidebar m-2 my-0 border-t-0 text-sm flex justify-between items-stretch h-[40px]",
        css`
          input {
            height: 100%;
            border-radius: 5px;
            padding-left: 5px;
            background: white;
          }
        `
      )}
    >
      <div className="p-1 flex">{left}</div>
      <div className="p-1 flex justify-end">{right}</div>
    </div>
  );
};
