import { DetailHash } from "@/components/model/utils/hash-type";
import { parseHash } from "@/lib/parse-hash";
import { navigate, useParams } from "@/lib/router";
import { useEffect } from "react";
import { layouts } from "shared/layouts";
import { ModelName } from "shared/types";
import { Fields, LayoutDetail } from "system/model/layout/types";
import { defaultColumns } from "system/model/model";
import { validate as isUUID } from "uuid";
import { useLocal } from "./use-local";
import { useModel } from "./use-model";
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
    prevId: null as string | null,
    nextId: null as string | null,
    loading: false,
    available: false,
    data: null as any,
    current: null as null | LayoutDetail<ModelName>,
    findBefore: async (currentId: string) => {
      if (!model.instance || DetailHash.includes(currentId) || !isUUID(currentId))
        return null;
      type WhereInput = {
        id: {
          lt: string;
        };
      };
      const record = await model.instance.findFirst({
        where: {
          id: {
            lt: currentId,
          },
        } as WhereInput,
        orderBy: {
          id: "desc",
        },
      });
      return record?.id || null;
    },
    findAfter: async (currentId: string) => {
      if (!model.instance || DetailHash.includes(currentId) || !isUUID(currentId))
        return null;
      type WhereInput = {
        id: {
          gt: string;
        };
      };
      const record = await model.instance.findFirst({
        where: {
          id: {
            gt: currentId,
          },
        } as WhereInput,
        orderBy: {
          id: "asc",
        },
      });
      return record?.id || null;
    },
    del: async (data: ModelRecord) => {
      if (!model.instance || !data.id) {
        return { success: false };
      }

      try {
        await model.instance.delete({
          where: { id: data.id },
        });
        return { success: true };
      } catch (error) {
        console.error("Error deleting record:", error);
        return { success: false };
      }
    },
    save: async (data: ModelRecord) => {
      if (!model.instance) {
        return { success: false };
      }

      try {
        let newId = undefined;
        const pk = model.instance.config.primaryKey;
        if (data[pk]) {
          await model.instance.update({
            where: { [pk]: data[pk] },
            data,
          });
        } else {
          const res = await model.instance.create({
            data,
          });
          if (res) {
            newId = (res as any)[pk];
          }
        }
        return { success: true, newId };
      } catch (msg: any) {
        console.error("Error saving record:", msg.error);
        return { success: false, error: msg.error };
      }
    },
  });

  let layout = (layouts as any)[
    model.name
  ] as (typeof layouts)[keyof typeof layouts];

  if (model.ready) {
    if (layout && layout.detail) {
      detail.available = true;
      detail.current = layout.detail;
    }
  }

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      // Reset navigation IDs
      detail.prevId = null;
      detail.nextId = null;

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
      } else if (!isUUID(id)) {
        navigate(`/model/${model.name.toLowerCase()}`);
        return;
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

              return processFields(fields);
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

        if (isMounted) {
          // After loading current record, fetch prev/next IDs
          if (id && model.instance && detail) {
            const [data, prevId, nextId] = await Promise.all([
              model.instance.findMany(findManyParams),
              detail.findBefore(id),
              detail.findAfter(id),
            ]);
            detail.data = data[0];
            detail.prevId = prevId;
            detail.nextId = nextId;
            
            detail.render();
          }
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
  }, [model.instance, layout?.detail, params.id]);

  return detail;
};
