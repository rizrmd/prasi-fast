import { LayoutDetail } from "system/model/layout/types";

export const detail: LayoutDetail<"Role"> = {
  fields: {
    vertical: [
      { horizontal: [{ col: "name" }, { col: "name" }] },
      { horizontal: [{ col: "name" }, { col: "name" }] },
    ],
  },
  tabs: [
    { title: "Detail", type: "default" },
    { title: "User", type: "relation", name: "user" },
  ],
};
