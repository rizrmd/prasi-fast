import { apiContext, defineAPI } from "system/api";
import { PrismaClient } from "@prisma/client";
import { logAction } from "../utils/action-logger";

// Singleton pattern for PrismaClient
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default defineAPI({
  path: "/auth/logout",
  handler: async function () {
    const { req } = apiContext(this);
    const cookies = req.headers.get("Cookie") ?? "";
    // Get the last sessionId value (most recent) from potential multiple cookies
    const sessionId = cookies
      .split(";")
      .reverse()
      .find(cookie => cookie.trim().startsWith("sessionId="))
      ?.split("=")?.[1]?.trim();

    if (!sessionId) {
      return { success: true }; // Already logged out
    }

    try {
      // Get session with user before deleting
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true }
      });

      if (session) {
        // Log the logout action
        await logAction({
          userId: session.user_id,
          action: 'logout',
          ipAddress: session.ip_address || undefined,
          userAgent: session.user_agent || undefined,
        });
      }

      // Delete the session
      await prisma.session.delete({
        where: { id: sessionId },
      });

      return {
        success: true,
        headers: {
          "Set-Cookie": "sessionId=; Path=/; HttpOnly; SameSite=Strict"
        }
      };
    } catch (error) {
      console.error("Logout error:", error);
      return { error: "Failed to logout" };
    }
  },
});
