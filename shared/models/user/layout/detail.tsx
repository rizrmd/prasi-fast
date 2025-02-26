import { LayoutDetail } from "system/model/layout/types";

export const detail: LayoutDetail<"User"> = {
  fields: {
    vertical: [
      { horizontal: [{ col: "username" }, { col: "email" }] },
      { horizontal: [{ col: "email_verified_at" }, { rel: "roleDetail", col: "name" }] }
    ],
  },
  tabs: [
    { title: "Detail", type: "default" },
    { title: "Action Logs", type: "relation", name: "actionlogs" },
    { title: "Change Logs", type: "relation", name: "changelogs" },
    { title: "Sessions", type: "relation", name: "sessions" }
  ],
};
