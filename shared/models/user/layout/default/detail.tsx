import { LayoutDetail } from "system/model/layout/types";

export default {
  fields: {
    vertical: [
      {
        horizontal: [{ col: "username" }, { col: "email" }],
      },
      {
        horizontal: [{ rel: "role", col: "name" }],
      },
    ],
  },
  tabs: [{ title: "Detail", type: "default" }],
} as const satisfies LayoutDetail<"User">;
