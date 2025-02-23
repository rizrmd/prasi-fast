import { defineAPI } from "system/api";

export default defineAPI({
  path: "/auth/login",
  handler: async () => {
    return Response.json("karambol lakarsantri");
  },
});
