-- CreateTable
CREATE TABLE IF NOT EXISTS "generated_reports" (
    "id" TEXT NOT NULL,
    "reportCode" TEXT NOT NULL,
    "reportType" TEXT NOT NULL DEFAULT 'ASSIGNMENT_REPORT',
    "title" TEXT NOT NULL,
    "academicTerm" TEXT NOT NULL DEFAULT '1/2569',
    "targetClass" TEXT NOT NULL DEFAULT 'ALL',
    "assignmentId" TEXT,
    "fileKey" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "printedById" TEXT NOT NULL,
    "printedByName" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "generated_reports_reportCode_key" ON "generated_reports"("reportCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "generated_reports_reportCode_idx" ON "generated_reports"("reportCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "generated_reports_assignmentId_idx" ON "generated_reports"("assignmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "generated_reports_printedById_idx" ON "generated_reports"("printedById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "generated_reports_createdAt_idx" ON "generated_reports"("createdAt");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'generated_reports_printedById_fkey'
    ) THEN
        ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_printedById_fkey" 
        FOREIGN KEY ("printedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
