import { LayoutDetail } from "system/model/layout/types";

export const detail: LayoutDetail<"Role"> = {
  fields: {
    vertical: [{ horizontal: [{ col: "name" }] }],
  },
  tabs: [
    { title: "Detail", type: "default" },
    { title: "User", type: "relation", name: "user" },
  ],
};
