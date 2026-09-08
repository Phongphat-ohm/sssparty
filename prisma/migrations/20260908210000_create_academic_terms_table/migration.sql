-- CreateTable
CREATE TABLE IF NOT EXISTS "academic_terms" (
    "id" TEXT NOT NULL,
    "termCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "academic_terms_termCode_key" ON "academic_terms"("termCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "academic_terms_isCurrent_idx" ON "academic_terms"("isCurrent");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "academic_terms_isLocked_idx" ON "academic_terms"("isLocked");
