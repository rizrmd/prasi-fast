import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ActionLogParams {
  userId?: string;
  action: "login" | "logout" | "visit";
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export async function logAction({
  userId,
  action,
  ipAddress,
  userAgent,
  metadata,
}: ActionLogParams) {
  try {
    await prisma.actionLog.create({
      data: {
        id_user: userId,
        action,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: metadata || {},
      },
    });
  } catch (error) {
    console.error("Failed to log action:", error);
  }
}
