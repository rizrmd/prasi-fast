import { defineAPI } from "system/api";

export default defineAPI({
  path: "/auth/login",
  handler: async function (coba: string) {
    return "asda:" + coba;
  },
});
