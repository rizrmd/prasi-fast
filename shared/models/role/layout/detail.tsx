import { LayoutDetail } from "system/model/layout/types";

export const detail: LayoutDetail<"Role"> = {
  fields: {
    flow: "vertical",
    fields: [
      { flow: "horizontal", fields: [{ col: "name" }, { col: "name" }] },
      { flow: "horizontal", fields: [{ col: "name" }, { col: "name" }] },
    ],
  },
  tabs: ["user"],
};
