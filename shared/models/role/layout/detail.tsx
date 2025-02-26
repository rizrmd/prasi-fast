import { LayoutDetail } from "system/model/layout/types";

export const detail: LayoutDetail<"Role"> = {
  fields: {
    vertical: [
      { horizontal: [{ col: "name" }, { col: "name" }] },
      { horizontal: [{ col: "name" }, { col: "name" }] },
    ],
  },
  tabs: ["user"],
};
