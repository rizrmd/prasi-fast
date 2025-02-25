import { LayoutTable } from "system/model/layout/types";

export const table: LayoutTable<"Role"> = {
  columns: [
    { col: "name" },
    { rel: "user", col: "email" },
  ],
};
