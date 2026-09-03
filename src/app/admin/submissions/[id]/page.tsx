import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { getS3PublicUrl } from "@/lib/s3/client";
import { SubmissionFilePreviewer } from "@/components/admin/SubmissionFilePreviewer";
import { RubricGradingTable } from "@/components/admin/RubricGradingTable";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
} from "lucide-react";

export default async function TeacherGradingStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const resolvedParams = await params;
  const submissionId = resolvedParams.id;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      student: true,
      assignment: {
        include: {
          rubrics: { orderBy: { sortOrder: "asc" } },
          questions: { orderBy: { sortOrder: "asc" } },
          submissions: {
            select: { id: true, studentId: true },
            orderBy: { submittedAt: "asc" },
          },
        },
      },
      answers: {
        include: {
          question: true,
        },
      },
      grade: {
        include: {
          rubricScores: true,
        },
      },
    },
  });

  if (!submission) {
    notFound();
  }

  // ดึง Public URL ของไฟล์เพื่อแสดงผลใน Studio (ถ้ามีไฟล์)
  const downloadUrl = submission.fileKey ? getS3PublicUrl(submission.fileKey) : null;

  // คำนวณหา Previous / Next Submission เพื่อให้ครูกดตรวจคนต่อไปได้ทันที
  const siblingSubmissions = submission.assignment.submissions;
  const currentIndex = siblingSubmissions.findIndex((s) => s.id === submission.id);
  const prevSubmission = currentIndex > 0 ? siblingSubmissions[currentIndex - 1] : null;
  const nextSubmission =
    currentIndex < siblingSubmissions.length - 1 ? siblingSubmissions[currentIndex + 1] : null;

  const studentFullName = `${submission.student.firstName} ${submission.student.lastName}`;

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-[1600px] w-full mx-auto min-h-screen flex flex-col">
      {/* Studio Top Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/assignments/${submission.assignmentId}/submissions`}
            className="p-2 rounded-xl bg-[#FAF6F0] border border-[#EADBCC] text-[#7A6A5C] hover:text-[#3F342B] transition-colors"
            title="กลับหน้ารวมชิ้นงาน"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C5D23] bg-[#FAF0E1] px-2.5 py-0.5 rounded-full">
                Teacher Grading Studio
              </span>
              <span className="text-xs text-[#7A6A5C]">
                ชิ้นที่ {currentIndex + 1} จาก {siblingSubmissions.length}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-[#3F342B] truncate max-w-sm sm:max-w-xl">
              {submission.assignment.title}
            </h1>
          </div>
        </div>

        {/* Sibling Nav Buttons (Previous / Next Student) */}
        <div className="flex items-center gap-2">
          {prevSubmission ? (
            <Link
              href={`/admin/submissions/${prevSubmission.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#D9CABB] text-xs font-semibold text-[#5A4D41] hover:bg-[#FAF6F0] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">คนก่อนหน้า</span>
            </Link>
          ) : (
            <button
              disabled
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#EADBCC] text-xs font-semibold text-[#C5B7A8] bg-[#FAF6F0] cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">คนก่อนหน้า</span>
            </button>
          )}

          {nextSubmission ? (
            <Link
              href={`/admin/submissions/${nextSubmission.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#D9CABB] text-xs font-semibold text-[#5A4D41] hover:bg-[#FAF6F0] transition-colors"
            >
              <span className="hidden sm:inline">คนถัดไป</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              disabled
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#EADBCC] text-xs font-semibold text-[#C5B7A8] bg-[#FAF6F0] cursor-not-allowed"
            >
              <span className="hidden sm:inline">คนถัดไป</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Split-Screen Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* จอฝั่งซ้าย (55%): Live Previewer (รองรับ File, Link, Questions) */}
        <div className="lg:col-span-7 h-full sticky top-4">
          <SubmissionFilePreviewer
            submissionType={submission.submissionType}
            status={submission.status}
            downloadUrl={downloadUrl}
            fileName={submission.fileName}
            fileSize={submission.fileSize}
            mimeType={submission.mimeType}
            linkUrl={submission.linkUrl}
            answers={submission.answers.map((a) => ({
              questionId: a.questionId,
              questionText: a.question.questionText,
              hint: a.question.hint,
              imageUrl: a.question.imageUrl || (a.question.imageKey ? `/api/files/${a.question.imageKey}` : null),
              answerText: a.answerText,
            }))}
            comment={submission.comment}
            studentName={studentFullName}
            submittedAt={submission.submittedAt}
          />
        </div>

        {/* จอฝั่งขวา (45%): Interactive Rubric Table (ล็อกเมื่อเป็นแบบร่าง) */}
        <div className="lg:col-span-5 h-full">
          <RubricGradingTable
            submissionId={submission.id}
            assignmentMaxScore={submission.assignment.maxScore}
            rubrics={submission.assignment.rubrics}
            initialGrade={submission.grade}
            studentName={studentFullName}
            studentCode={submission.student.studentCode}
            className={submission.student.className}
            studentNumber={submission.student.studentNumber}
            isLate={submission.status === "LATE"}
            isDraft={submission.status === "DRAFT"}
          />
        </div>
      </div>
    </div>
  );
}
