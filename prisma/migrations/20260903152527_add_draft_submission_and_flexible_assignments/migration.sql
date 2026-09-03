-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('FILE', 'LINK', 'QUESTIONS');

-- AlterEnum
ALTER TYPE "SubmissionStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "submissionType" "SubmissionType" NOT NULL DEFAULT 'FILE';

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "linkUrl" TEXT,
ADD COLUMN     "submissionType" "SubmissionType" NOT NULL DEFAULT 'FILE',
ALTER COLUMN "fileKey" DROP NOT NULL,
ALTER COLUMN "fileName" DROP NOT NULL,
ALTER COLUMN "fileSize" DROP NOT NULL,
ALTER COLUMN "mimeType" DROP NOT NULL;

-- CreateTable
CREATE TABLE "assignment_attachments" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_questions" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "hint" TEXT,
    "imageKey" TEXT,
    "imageUrl" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_answers" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignment_attachments_assignmentId_idx" ON "assignment_attachments"("assignmentId");

-- CreateIndex
CREATE INDEX "assignment_questions_assignmentId_idx" ON "assignment_questions"("assignmentId");

-- CreateIndex
CREATE INDEX "question_answers_submissionId_idx" ON "question_answers"("submissionId");

-- CreateIndex
CREATE INDEX "question_answers_questionId_idx" ON "question_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "question_answers_submissionId_questionId_key" ON "question_answers"("submissionId", "questionId");

-- AddForeignKey
ALTER TABLE "assignment_attachments" ADD CONSTRAINT "assignment_attachments_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_answers" ADD CONSTRAINT "question_answers_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_answers" ADD CONSTRAINT "question_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "assignment_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
