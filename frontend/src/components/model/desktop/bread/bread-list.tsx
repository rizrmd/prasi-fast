import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { useValtioTab } from "@/hooks/use-valtio-tab";
import { Link } from "@/lib/router";
import { FC } from "react";
import { useSnapshot } from "valtio";

export const ModelBreadList: FC<{}> = ({}) => {
  const { state } = useValtioTab();
  const tab = useSnapshot(state);
  const nav = tab.nav;
  const name = nav.modelName.toLowerCase()
  return (
    <Breadcrumb className="p-2 bg-transparent select-none">
      <BreadcrumbList>
        <BreadcrumbItem>
          <Link to={`/model/${name}`} className="hover:underline">
            {nav.modelName}
          </Link>
        </BreadcrumbItem>
        {/* {state.breads.list.map((bread, index) => (
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
        )} */}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
