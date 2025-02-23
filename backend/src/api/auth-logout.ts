import { defineAPI } from "system/api";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineAPI({
  path: "/auth/logout",
  handler: async function (req) {
    const sessionId = req.cookies.get("sessionId");
    
    if (!sessionId) {
      return { success: true }; // Already logged out
    }

    try {
      // Delete the session
      await prisma.session.delete({
        where: { id: sessionId }
      });

      // Clear the session cookie
      req.cookies.delete("sessionId");

      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { error: "Failed to logout" };
    }
  },
});
