import { LayoutTable } from "system/model/layout/types";

export const table: LayoutTable<"Role"> = {
  columns: [
    { col: "name" },
    // Simple relation
    { rel: "user", col: "email" },
    // Nested relation showing user->role circular relationship
    { rel: { user: { roleDetail: { col: "name" } } } },
    // Direct role field from user
    { rel: { user: { col: "role" } } },
  ],
};
