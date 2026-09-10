-- AlterTable
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "allowLateSubmission" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "lateDueDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "assignments_lateDueDate_idx" ON "assignments"("lateDueDate");
