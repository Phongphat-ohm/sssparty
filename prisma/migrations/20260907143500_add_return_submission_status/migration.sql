-- AlterEnum
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'RETURNED';

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "returnReason" TEXT;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "returnedAt" TIMESTAMP(3);
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "returnedById" TEXT;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'submissions_returnedById_fkey'
    ) THEN
        ALTER TABLE "submissions" ADD CONSTRAINT "submissions_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
