-- AlterTable
ALTER TABLE "attendance_sessions" ADD COLUMN IF NOT EXISTS "onTimeCutoffTime" TEXT;

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN IF NOT EXISTS "customCutoffTime" TEXT;
