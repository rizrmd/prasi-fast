import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocal } from "@/hooks/use-local";
import { ProtectedRoute } from "@/lib/auth";
import { parseHash } from "@/lib/parse-hash";
import { Link, useParams } from "@/lib/router";
import { FC, Fragment, ReactNode, useEffect } from "react";
import * as models from "shared/models";
import { ModelName } from "shared/types";
import { ModelNavTabs } from "./nav-tabs";
import { SimpleTooltip } from "../ext/simple-tooltip";
import { Button } from "../ui/button";
import { useModel } from "@/hooks/use-model";
import { cn } from "@/lib/utils";
import { Plus, TriangleAlert } from "lucide-react";
import { css } from "goober";

export const ModelContainer: FC<{
  children: ReactNode;
  modelName: ModelName;
}> = ({ children, modelName }) => {
  const model = useModel({ modelName });
  const params = useParams();
  return (
    <ProtectedRoute>
      <div className="flex flex-col flex-1 bg-slate-100">
        <ModelNavTabs modelName={modelName} />

        {modelName ? (
          <>
            <div className="flex border-b  bg-white items-stretch justify-between">
              <ContainerBreadcrumb />
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
                {!params.id && (
                  <SimpleTooltip content="Tambah data baru">
                    <Button
                      size="sm"
                      asDiv
                      href={`/model/${model.instance?.config.modelName.toLowerCase()}/detail/new`}
                      className={cn("text-xs rounded-sm cursor-pointer")}
                    >
                      <Plus strokeWidth={1.5} />
                      <div className="-ml-1">Tambah</div>
                    </Button>
                  </SimpleTooltip>
                )}
              </div>
            </div>
            <div className="p-2 flex flex-1 items-stretch flex-col">
              {children}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center flex-col space-x-1 bg-white">
            <TriangleAlert size={40} strokeWidth={1} />
            <div className="text-center flex flex-col">
              <div>404: Not Found</div>
              <hr className="my-1 w-[170px] border-t border-t-slate-300 border-b border-b-slate-200" />
              <small className="">
                Halaman yang dituju
                <br />
                tidak dapat ditemukan
              </small>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

const ContainerBreadcrumb = ({}: {}) => {
  const local = useLocal({
    loading: false,
    breads: [] as { title: string; url: string }[],
    model: null as any,
    modelData: null as any,
  });

  const loadBreadcrumbs = async () => {
    try {
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
        breads.push({
          title: model.config.modelName,
          url: `/model/${model.config.modelName.toLowerCase()}`,
        });

        if (parts[1] === "detail" && parts[2]) {
          local.breads = breads;
          local.loading = true;
          local.render();
          const id = parts[2];
          if (id === "new" || id === "clone") {
            const prev_id = parseHash()["prev"];
            if (prev_id) {
              try {
                const data = (await model.findFirst(prev_id)) as any;
                if (data) {
                  breads.push({
                    title: model.title(data),
                    url: `/model/${parts[0]}/detail/${prev_id}`,
                  });
                }
              } catch (e) {}
            }
            breads.push({
              title: id === "new" ? "Tambah Baru" : "Duplikat",
              url: `/model/${parts[0]}/detail/${id}`,
            });
          } else {
            const data = (await model.findFirst(id)) as any;
            const newTitle = model.title(data);
            breads.push({
              title: newTitle,
              url: `/model/${parts[0]}/detail/${id}`,
            });
          }
        }
        local.breads = breads;
      }
    } catch (error) {
      console.error(error);
    } finally {
      local.loading = false;
      local.render();
    }
  };

  useEffect(() => {
    loadBreadcrumbs();
  }, [location.pathname, location.hash, local.modelData]);

  useEffect(() => {
    if (local.model) {
      const unsubscribe = local.model.onUpdate((data: Record<string, any>) => {
        local.modelData = data;
        local.render();
      });
      return () => unsubscribe();
    }
  }, [local.model]);

  useEffect(() => {
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
      local.model = model;
      local.render();
    }
  }, [location.pathname]);

  return (
    <Breadcrumb className="p-2 bg-transparent select-none">
      <BreadcrumbList>
        {local.breads.map((bread, index) => (
          <Fragment key={index}>
            <BreadcrumbItem>
              {index === local.breads.length - 1 ? (
                <>{bread.title}</>
              ) : (
                <Link to={bread.url} className="hover:underline">
                  {bread.title}
                </Link>
              )}
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
