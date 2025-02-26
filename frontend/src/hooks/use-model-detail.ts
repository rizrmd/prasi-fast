import { useEffect } from "react";
import { useLocal } from "./use-local";
import { useModel } from "./use-model";
import { layouts } from "shared/layouts";

export const useModelDetail = ({
  model,
}: {
  model: ReturnType<typeof useModel>;
}) => {
  const detail = useLocal({
    ready: false,
    available: false,
    loading: false,
  });

  let layout = (layouts as any)[
    model.name
  ] as (typeof layouts)[keyof typeof layouts];

  useEffect(() => {
    if (model.ready) {
      detail.ready = true;
      if (layout && layout.detail) {
        detail.available = true;
      }
    } else {
      detail.ready = false;
    }
    detail.render();
  }, [model.ready, layout]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!detail.ready || !model.instance || !layout?.table) return;

      detail.loading = false;
      detail.render();
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [detail.ready, model.instance, layout?.detail]);

  return detail;
};
