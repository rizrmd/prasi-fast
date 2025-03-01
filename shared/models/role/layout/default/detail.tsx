import { LayoutDetail } from "system/model/layout/types";

export default {
  fields: {
    vertical: [{ horizontal: [{ col: "name" }] }],
  },
  tabs: [
    { title: "Detail", type: "default" },
    { title: "User", type: "relation", name: "user" },
  ],
} as const satisfies LayoutDetail<"Role">;
