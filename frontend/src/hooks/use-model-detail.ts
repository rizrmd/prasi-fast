import { useParams } from "@/lib/router";
import { useEffect } from "react";
import { layouts } from "shared/layouts";
import { ModelName } from "shared/types";
import { Fields, LayoutDetail } from "system/model/layout/types";
import { defaultColumns } from "system/model/model";
import { useLocal } from "./use-local";
import { useModel } from "./use-model";
import { parseHash } from "@/lib/parse-hash";

type ModelRecord = {
  id: string;
  [key: string]: any;
};

export const useModelDetail = ({
  model,
}: {
  model: ReturnType<typeof useModel>;
}) => {
  const params = useParams();
  const detail = useLocal({
    loading: false,
    available: false,
    data: null as any,
    current: null as null | LayoutDetail<ModelName>,
    del: async (data: any) => {
      console.log(data);

      await new Promise((done) => {
        setTimeout(done, 500);
      });
      return { success: true };
    },
    save: async (data: any) => {
      console.log(data);

      await new Promise((done) => {
        setTimeout(done, 500);
      });
      return { success: true };
    },
  });

  let layout = (layouts as any)[
    model.name
  ] as (typeof layouts)[keyof typeof layouts];

  useEffect(() => {
    if (model.ready) {
      detail.loading = false;
      if (layout && layout.detail) {
        detail.available = true;
        detail.current = layout.detail;
      }
    } else {
      detail.loading = false;
    }
    detail.render();
  }, [model.ready, layout]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!model.instance || !layout?.detail) return;

      let id = params.id;
      if (params.id === "new") {
        detail.data = {} as any;
        detail.loading = false;
        detail.render();
        return;
      } else if (params.id === "clone") {
        const prev_id = parseHash()["prev"];
        if (prev_id) {
          id = prev_id;
        } else {
          return;
        }
      }

      detail.loading = true;
      detail.render();

      try {
        const findManyParams: {
          select: { [key: string]: boolean | object | string };
          where: { id: string };
        } = {
          select: (() => {
            const selectFields: { [key: string]: boolean | object } = {
              id: true,
            };

            // Add default columns
            defaultColumns.forEach((col) => {
              selectFields[col] = true;
            });

            // Convert Fields to Prisma select
            const convertFieldsToPrismaSelect = <T extends ModelName>(
              fields: Fields<T>
            ): Record<
              string,
              boolean | { select: Record<string, boolean | object> }
            > => {
              const processFields = (
                input: Fields<T>
              ): Record<
                string,
                boolean | { select: Record<string, boolean | object> }
              > => {
                if (Array.isArray(input)) {
                  const result = {} as Record<
                    string,
                    boolean | { select: Record<string, boolean | object> }
                  >;
                  for (const item of input) {
                    const nestedResults = processFields(item);
                    Object.assign(result, nestedResults);
                  }
                  return result;
                } else if ("vertical" in input) {
                  const result = {} as Record<
                    string,
                    boolean | { select: Record<string, boolean | object> }
                  >;
                  for (const item of input.vertical) {
                    const nestedResults = processFields(item);
                    Object.assign(result, nestedResults);
                  }
                  return result;
                } else if ("horizontal" in input) {
                  const result = {} as Record<
                    string,
                    boolean | { select: Record<string, boolean | object> }
                  >;
                  for (const item of input.horizontal) {
                    const nestedResults = processFields(item);
                    Object.assign(result, nestedResults);
                  }
                  return result;
                } else if ("col" in input) {
                  return { [String(input.col)]: true };
                }
                return {};
              };

              const result = processFields(fields);
              return result;
            };

            // Add detail fields
            if (layout.detail.fields) {
              Object.assign(
                selectFields,
                convertFieldsToPrismaSelect(layout.detail.fields)
              );
            }

            return selectFields;
          })(),
          where: { id },
        };

        const data = await model.instance.findMany(findManyParams);
        if (isMounted && data) {
          detail.data = data[0] || null;
        }
      } catch (error) {
        console.error("Error fetching model detail:", error);
      }

      detail.loading = false;
      detail.render();
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [model.instance, layout?.detail]);

  return detail;
};
