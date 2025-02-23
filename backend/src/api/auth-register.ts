import { apiContext, defineAPI } from "system/api";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

export default defineAPI({
  path: "/auth/register",
  handler: async function (opt: {
    email: string;
    password: string;
    username: string;
  }) {
    const { ip, req } = apiContext(this);
    const { email, password, username } = opt;

    if (!password || !username) {
      return { error: "Missing required fields" };
    }

    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        return { error: "Email already registered" };
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password_hash: hashPassword(password),
          role: "user",
        },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
        },
      });

      // Create session
      const session = await prisma.session.create({
        data: {
          user_id: user.id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          ip_address: ip,
          user_agent: req.headers.get("user-agent") || undefined,
        },
      });

      // Set session cookie
      const cookieOptions = [
        `sessionId=${session.id}`,
        "HttpOnly",
        "Secure",
        "SameSite=Strict",
        `Max-Age=${30 * 24 * 60 * 60}`, // 30 days in seconds
      ].join("; ");

      const result = { user };
      const res = Response.json(result);
      res.headers.set("Set-Cookie", cookieOptions);

      return res as unknown as typeof result;
    } catch (error) {
      console.error("Registration error:", error);
      return { error: "Failed to register user" };
    }
  },
});
