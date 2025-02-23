import { apiContext, defineAPI } from "system/api";
import { PrismaClient } from "@prisma/client";
import { logAction } from "../utils/action-logger";

const prisma = new PrismaClient();

export default defineAPI({
  path: "/auth/check",
  handler: async function () {
    const { req } = apiContext(this);
    const cookies = req.headers.get("Cookie") ?? "";
    // Get the last sessionId value (most recent) from potential multiple cookies
    const sessionId = cookies
      .split(";")
      .reverse()
      .find((cookie) => cookie.trim().startsWith("sessionId="))
      ?.split("=")?.[1]
      ?.trim();

    if (!sessionId) {
      return { error: "No session found" };
    }

    try {
      const session = await prisma.session.findFirst({
        where: {
          AND: [{ id: sessionId }, { expires_at: { gt: new Date() } }],
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              role: true,
            },
          },
        },
      });

      if (!session) {
        return { error: "Invalid or expired session" };
      }

      return { user: session.user };
    } catch (error) {
      console.error("Session check error:", error);
      return { error: "Failed to verify session" };
    }
  },
});
