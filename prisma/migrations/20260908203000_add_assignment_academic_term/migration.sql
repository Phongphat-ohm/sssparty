-- AlterTable
ALTER TABLE "assignments" ADD COLUMN "academicTerm" TEXT NOT NULL DEFAULT '1/2569';

-- CreateIndex
CREATE INDEX "assignments_academicTerm_idx" ON "assignments"("academicTerm");
