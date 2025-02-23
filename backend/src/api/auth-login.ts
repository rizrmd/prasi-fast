import { apiContext, defineAPI } from "system/api";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { apiClient } from "system/api/client";

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
  handler: async function (opt: { email: string; password: string }) {
    const { email, password } = opt;
    const { req, ip } = apiContext(this);

    if (!email || !password) {
      return { error: "Email and password are required" };
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email },
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
          user_id: user.id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          ip_address: ip,
          user_agent: req.headers.get("user-agent") || undefined,
        },
      });

      // Set session cookie
      const response = new Response(null);
      response.headers.set(
        "Set-Cookie",
        `sessionId=${session.id}; HttpOnly; Secure; SameSite=Strict; Max-Age=${
          30 * 24 * 60 * 60
        }`
      );

      // Return user data without sensitive fields
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      console.error("Login error:", error);
      return { error: "Failed to login" };
    }
  },
});
