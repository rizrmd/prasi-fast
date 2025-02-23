import type auth from "backend/src/api/auth";

export const api = {
  auth: {
    path: "/api/auth",
    handler: (() => {}) as unknown as (typeof auth)["handler"],
  },
};
