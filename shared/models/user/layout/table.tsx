import { LayoutTable } from "system/model/layout/types";

export const table: LayoutTable<"User"> = {
  columns: [
    { col: "username" },
    { col: "email" },
    { rel: "roleDetail", col: "name" }
  ],
};
