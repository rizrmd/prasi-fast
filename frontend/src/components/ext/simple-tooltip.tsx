import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FC, ReactNode } from "react";

export const SimpleTooltip: FC<{ content: ReactNode; children: ReactNode }> = ({
  content,
  children,
}) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent sideOffset={0} alignOffset={0}>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
