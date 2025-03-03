import { SimpleTooltip } from "@/components/ext/simple-tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { css } from "goober";
import { isValidElement, ReactElement } from "react";

export type BreadAction = {
  href?: string;
  tooltip?: string;
  label: ReactElement;
  onClick?: () => void;
};
export const ModelBreadAction = () => {
  const actions: BreadAction[] = [];
  return (
    <>
      <div
        className={cn(
          "flex px-2 py-1",
          css`
            .button {
              height: auto;
              min-height: 0;
              padding: 0px 6px;
            }
          `
        )}
      >
        {actions.map((item) => {
          return (
            <SimpleTooltip content={item.tooltip}>
              <Button
                size="sm"
                asDiv
                href={item.href}
                className={cn("text-xs rounded-sm cursor-pointer")}
                onClick={item.onClick}
              >
                {isValidElement(item.label) && item.label}
              </Button>
            </SimpleTooltip>
          );
        })}
      </div>
    </>
  );
};
