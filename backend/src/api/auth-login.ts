import { apiContext, defineAPI } from "system/api";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { apiClient } from "system/api/client";
import { logAction } from "../utils/action-logger";

const prisma = new PrismaClient();

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  const testHash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return hash === testHash;
}

export default defineAPI({
  path: "/auth/login",
  handler: async function (opt: { username: string; password: string }) {
    const { username, password } = opt;
    const { req, ip } = apiContext(this);

    if (!username || !password) {
      return { error: "Email and password are required" };
    }

    try {
      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        return { error: "Invalid email or password" };
      }

      if (!verifyPassword(password, user.password_hash)) {
        return { error: "Invalid email or password" };
      }

      // Create new session
      const session = await prisma.session.create({
        data: {
          id_user: user.id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          ip_address: ip,
          user_agent: req.headers.get("user-agent") || undefined,
        },
      });

      // Log the successful login
      await logAction({
        userId: user.id,
        action: "login",
        ipAddress: ip,
        userAgent: req.headers.get("user-agent") || undefined,
      });

      // Return user data with session cookie
      return {
        user,
        headers: {
          "Set-Cookie": `sessionId=${session.id}; HttpOnly; Path=/; Max-Age=${
            30 * 24 * 60 * 60
          }; ${
            process.env.NODE_ENV === "production" ? "Secure; " : ""
          }SameSite=Lax`,
        },
      };
    } catch (error) {
      console.error("Login error:", error);
      return { error: "Failed to login" };
    }
  },
});
