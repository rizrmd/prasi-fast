import { LayoutDetail } from "system/model/layout/types";

export const detail: LayoutDetail<"User"> = {
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
};
