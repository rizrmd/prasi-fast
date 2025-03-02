import * as models from "shared/models";
import { ModelName } from "shared/types";
import { ValtioTab } from "./types";
import cuid from "@bugsnag/cuid";
import { createValtioTabState } from "./tab-state";
import { createValtioTabAction } from "./tab-actions";

export const valtio_tabs = {} as Record<string, ValtioTab>;

type HASH_ID = string;
type MODEL_ID = string;
export const getTabID = (
  params: { name: string; id?: string },
  hash: Partial<{ parent: HASH_ID; filter: HASH_ID; prev: MODEL_ID }>
) => {
  let modelName = Object.keys(models).find(
    (e) => e.toLowerCase() === params.name.toLowerCase()
  ) as ModelName;

  const tabId = cuid();

  const tab = {
    state: createValtioTabState(tabId),
    action: {},
  };

  tab.action = createValtioTabAction(tab.state);

  if (!modelName) return "";

  return "";
};
