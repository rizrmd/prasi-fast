import { apiContext, defineAPI } from "system/api";
import { g } from "../utils/global";

export default defineAPI({
  path: "/api/object-hash",
  handler: async function (hash: string, value?: any) {
    const { req, ip } = apiContext(this);

    if (value) {
      g.sqlite.objectHash.set(hash, value);

      return { status: "ok" };
    }

    return g.sqlite.objectHash.get(hash);
  },
});
