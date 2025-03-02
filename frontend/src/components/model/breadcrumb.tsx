import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useValtioTab } from "@/hooks/use-valtio-tab";
import { Link } from "@/lib/router";
import { FC, Fragment } from "react";
import { useSnapshot } from "valtio";
import { BreadcrumbList } from "../ui/breadcrumb";

export const ModelBreadcrumb: FC<{
  tabId: string;
}> = ({ tabId }) => {
  const tab = useValtioTab(tabId);
  const state = useSnapshot(tab.state);

  return (
    <Breadcrumb className="p-2 bg-transparent select-none">
      <BreadcrumbList>
        {state.breads.list.map((bread, index) => (
          <Fragment key={index}>
            <BreadcrumbItem>
              {index === state.breads.list.length - 1 ? (
                <>{bread.title}</>
              ) : (
                <Link to={bread.url} className="hover:underline">
                  {bread.title}
                </Link>
              )}
            </BreadcrumbItem>
            {index < state.breads.list.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
        {state.breads.loading && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <div className="h-[20px] flex items-center">
                <Skeleton className="h-[15px] w-[60px]" />
              </div>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
