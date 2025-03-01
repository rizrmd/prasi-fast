import { LayoutList } from "system/model/layout/types";

export default {
  columns: [
    { col: "username" },
    { col: "email" },
    { rel: "role", col: "name" },
  ],
} as const satisfies LayoutList<"User">;
