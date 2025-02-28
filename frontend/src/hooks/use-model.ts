import { useEffect, useState } from "react";
import { useLocal } from "./use-local";
import * as models from "shared/models";
import { ModelName } from "shared/types";

export const useModel = <M extends ModelName>({
  modelName,
}: {
  modelName: M;
}) => {
  const local = useLocal({
    name: "",
    ready: false,
    instance: null as null | (typeof models)[ModelName],
    render: () => {},
  });
  if (modelName !== local.name) {
    local.ready = false;
    const model = (models as any)[modelName];
    if (model) {
      local.name = modelName;
      local.instance = model;
      local.ready = true;
    } else {
      local.name = "";
      local.instance = null;
      local.ready = true;
      console.warn("Model not found", modelName);
    }
  }

  return local;
};
