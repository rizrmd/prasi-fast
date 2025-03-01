import { LayoutList } from "system/model/layout/types";

export default {
  columns: [{ col: "name" }, { rel: "user", col: "username" }],
} as const satisfies LayoutList<"Role">;
