-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'TEACHER', 'ASSISTANT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AdminPermission" AS ENUM ('MANAGE_ASSIGNMENTS', 'GRADE_SUBMISSIONS', 'MANAGE_ATTENDANCE', 'MANAGE_STUDENTS', 'MANAGE_USERS', 'VIEW_AUDIT_LOGS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "adminRole" "AdminRole" DEFAULT 'TEACHER',
ADD COLUMN     "permissions" "AdminPermission"[] DEFAULT ARRAY[]::"AdminPermission"[];

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT,
    "role" "Role",
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_idx" ON "audit_logs"("targetType");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
