import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { useLocal } from "@/hooks/use-local";
import { ProtectedRoute } from "@/lib/auth";
import { Link } from "@/lib/router";
import { FC, Fragment, ReactNode, useEffect } from "react";
import * as models from "shared/models";
import { ModelName } from "shared/types";
import { Skeleton } from "../ui/skeleton";

export const ModelContainer: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ProtectedRoute>
      <div className="flex flex-col flex-1 bg-slate-100">
        <ContainerBreadcrumb />
        <div className="p-2  flex flex-1 items-stretch flex-col">
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
};

const ContainerBreadcrumb = ({}: {}) => {
  const local = useLocal({
    loading: false,
    breads: [] as { title: string; url: string }[],
  });

  useEffect(() => {
    (async () => {
      const parts = location.pathname
        .substring("/model".length)
        .split("/")
        .filter((e) => e);

      let modelName = Object.keys(models).find((name) => {
        if (name.toLowerCase() === parts[0]) {
          return name;
        }
      }) as ModelName;

      const model = models[modelName];
      if (model) {
        const breads = [] as typeof local.breads;
        if (model) {
          breads.push({
            title: model.config.modelName,
            url: `/model/${model.config.modelName.toLowerCase()}`,
          });
        }

        if (parts[1] === "detail" && parts[2]) {
          local.breads = breads;
          local.loading = true;
          local.render();
          const data = (await model.findFirst(parts[2])) as any;

          breads.push({
            title: model.title(data),
            url: `/model/${parts[0]}/detail/${parts[2]}`,
          });
        }
        local.breads = breads;
      }
      local.loading = false;
      local.render();
    })();
  }, [location.pathname, location.hash]);
  return (
    <Breadcrumb className="p-2 border-b">
      <BreadcrumbList>
        {local.breads.map((bread, index) => (
          <Fragment key={index}>
            <BreadcrumbItem className="hover:underline">
              <Link to={bread.url}>{bread.title}</Link>
            </BreadcrumbItem>
            {index < local.breads.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
        {local.loading && (
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
