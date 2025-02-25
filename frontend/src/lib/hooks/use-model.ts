import { useEffect } from "react";
import { useLocal } from "./use-local";
import * as models from "shared/models";
import { ModelName } from "shared/types";

export const useModel = <M extends ModelName>({
  modelName,
  onInit,
}: {
  modelName: M;
  onInit?: () => void;
}) => {
  const local = useLocal({
    name: "",
    ready: false,
    instance: null as null | (typeof models)[ModelName],
  });

  useEffect(() => {
    if (modelName !== local.name) {
      local.ready = false;
      local.render();
      const model = (models as any)[modelName];
      if (model) {
        local.name = modelName;
        local.instance = model;
        local.ready = true;
        local.render();
        onInit?.();
      } else {
        console.warn("Model not found", modelName);
      }
    }
  }, [modelName]);
  return local;
};
