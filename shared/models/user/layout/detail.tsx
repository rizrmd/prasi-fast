import { LayoutDetail } from "system/model/layout/types";

export const detail: LayoutDetail<"User"> = {
  fields: {
    vertical: [
      {
        horizontal: [{ col: "username" }, { col: "email" }],
      },
    ],
  },
  tabs: [
    { title: "Detail", type: "default" },
    {
      title: "Actionlogs",
      type: "relation",
      name: "actionlogs",
    },
    {
      title: "Changelogs",
      type: "relation",
      name: "changelogs",
    },
    {
      title: "Sessions",
      type: "relation",
      name: "sessions",
    },
    {
      title: "Role",
      type: "relation",
      name: "role",
    },
  ],
};
