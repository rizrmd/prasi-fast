/*
  Warnings:

  - You are about to drop the `auth_sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "auth_sessions" DROP CONSTRAINT "auth_sessions_user_id_fkey";

-- DropTable
DROP TABLE "auth_sessions";

-- CreateTable
CREATE TABLE "s_session" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "s_session_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "s_session" ADD CONSTRAINT "s_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "m_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
