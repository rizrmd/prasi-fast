import { apiContext, defineAPI } from "system/api";
import { PrismaClient } from "@prisma/client";

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
    const sessionId = cookies
      .split(";")
      .find(cookie => cookie.trim().startsWith("sessionId="))
      ?.split("=")?.[1];

    if (!sessionId) {
      return { success: true }; // Already logged out
    }

    try {
      // Delete the session
      await prisma.session.delete({
        where: { id: sessionId },
      });

      return {
        success: true,
        headers: {
          "Set-Cookie": `sessionId=; Path=/; Expires=${new Date(0).toUTCString()}; HttpOnly; SameSite=Strict`
        }
      };
    } catch (error) {
      console.error("Logout error:", error);
      return { error: "Failed to logout" };
    }
  },
});
