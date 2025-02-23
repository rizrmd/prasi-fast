import { apiContext, defineAPI } from "system/api";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineAPI({
  path: "/auth/check",
  handler: async function () {
    const { req } = apiContext(this);
    const cookies = req.headers.get("cookie");
    const sessionId = cookies
      ?.split(";")
      .find((c) => c.trim().startsWith("sessionId="))
      ?.split("=")[1];

    if (!sessionId) {
      return { error: "No session found" };
    }

    try {
      const session = await prisma.session.findUnique({
        where: {
          id: sessionId,
          expires_at: { gt: new Date() },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
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
