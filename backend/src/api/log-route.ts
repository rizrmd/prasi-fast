import { apiContext, defineAPI } from "system/api";
import { logAction } from "../utils/action-logger";

export default defineAPI({
  path: "/api/log-route",
  handler: async function (route: string, userId?: number) {
    const { req, ip } = apiContext(this);
    const userAgent = req.headers.get("user-agent") || undefined;

    await logAction({
      action: "visit",
      ipAddress: ip,
      userId: userId,
      userAgent: userAgent,
      metadata: { route },
    });

    return { success: true };
  },
});
