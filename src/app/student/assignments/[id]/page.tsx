import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import {
  ArrowLeft,
  Clock,
  FileCheck,
  AlertCircle,
  Paperclip,
  Image as ImageIcon,
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Presentation,
  Archive,
} from "lucide-react";
import { StudentSubmissionForm } from "@/components/student/StudentSubmissionForm";
import { MarkdownViewer } from "@/components/ui/MarkdownViewer";
import { getFileTypeCategory } from "@/lib/s3/file-validator";

export default async function StudentAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAuthSession();
  if (!session || session.role !== "STUDENT" || !session.studentId) {
    redirect("/student-login");
  }

  const resolvedParams = await params;
  const assignmentId = resolvedParams.id;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      rubrics: { orderBy: { sortOrder: "asc" } },
      attachments: { orderBy: { createdAt: "asc" } },
      questions: { orderBy: { sortOrder: "asc" } },
      submissions: {
        where: { studentId: session.studentId },
        include: {
          grade: {
            include: { rubricScores: true },
          },
          answers: true,
        },
      },
    },
  });

  if (!assignment || assignment.status === "DRAFT") {
    notFound();
  }

  const submission = assignment.submissions[0] || null;
  const isPastDue = Date.now() > new Date(assignment.dueDate).getTime();

  return (
    <div className="space-y-6">
      {/* Back Button & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Link
          href="/student/assignments"
          className="p-2 rounded-xl bg-white border border-[#EADBCC] text-[#7A6A5C] hover:text-[#3F342B] transition-colors"
          title="กลับหน้ารวมงาน"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#8C5D23] uppercase tracking-wider">
              ภาระงานชุมนุมสื่อสร้างสรรค์
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                assignment.submissionType === "FILE"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : assignment.submissionType === "LINK"
                  ? "bg-blue-50 text-blue-800 border-blue-200"
                  : "bg-purple-50 text-purple-800 border-purple-200"
              }`}
            >
              {assignment.submissionType === "FILE" && "📁 ส่งแบบไฟล์"}
              {assignment.submissionType === "LINK" && "🔗 ส่งแบบลิงก์"}
              {assignment.submissionType === "QUESTIONS" && `📝 ตอบคำถาม (${assignment.questions.length} ข้อ)`}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#3F342B] tracking-tight">
            {assignment.title}
          </h1>
        </div>
      </div>

      {/* Assignment Overview Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EADBCC] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2E8DC] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FAF0E1] text-[#8C5D23] border border-[#EADBCC]">
              คะแนนเต็ม: {assignment.maxScore} คะแนน
            </span>

            <span className="text-xs text-[#7A6A5C] flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4 text-[#C96B4B]" />
              กำหนดส่ง:{" "}
              <strong className="text-[#3F342B]">
                {new Date(assignment.dueDate).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </span>
          </div>

          {isPastDue && !submission && (
            <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              เลยกำหนดส่งแล้ว (หากส่งตอนนี้จะบันทึกเป็นส่งล่าช้า)
            </span>
          )}
        </div>

        {/* Description (Markdown Formatted) */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#5A4D41]">
            คำสั่งและรายละเอียดภาระงาน
          </h2>
          <div className="bg-[#FAF6F0] p-5 sm:p-6 rounded-3xl border border-[#EADBCC]">
            <MarkdownViewer content={assignment.description} />
          </div>
        </div>

        {/* Teacher Attachments (If any) */}
        {assignment.attachments.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-[#F2E8DC]">
            <div className="flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-[#D9A441]" />
              <h3 className="text-xs font-bold text-[#3F342B]">
                เอกสารและรูปภาพประกอบโจทย์จากคุณครู ({assignment.attachments.length} รายการ)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assignment.attachments.map((att) => {
                const cat = getFileTypeCategory(att.fileName, att.mimeType);
                const isImg = cat.type === "image";
                const fileUrl = `/api/files/${att.fileKey}`;

                return (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] flex flex-col justify-between gap-3 shadow-2xs hover:border-[#D9A441] transition-all"
                  >
                    {isImg && (
                      <div className="w-full h-44 rounded-xl overflow-hidden bg-black/5 border border-[#EADBCC] relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={fileUrl}
                          alt={att.fileName}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-white border border-[#EADBCC] flex items-center justify-center shrink-0">
                          {cat.type === "image" && <ImageIcon className="w-4 h-4 text-amber-500" />}
                          {cat.type === "pdf" && <FileText className="w-4 h-4 text-red-500" />}
                          {cat.type === "word" && <FileText className="w-4 h-4 text-blue-500" />}
                          {cat.type === "excel" && <FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
                          {cat.type === "powerpoint" && <Presentation className="w-4 h-4 text-orange-500" />}
                          {cat.type === "archive" && <Archive className="w-4 h-4 text-purple-500" />}
                          {!["image", "pdf", "word", "excel", "powerpoint", "archive"].includes(cat.type) && (
                            <FileText className="w-4 h-4 text-[#5A4D41]" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-[#3F342B] truncate">{att.fileName}</p>
                          <p className="text-[10px] text-[#7A6A5C]">
                            {(att.fileSize / (1024 * 1024)).toFixed(2)} MB • {cat.label}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-white border border-[#D9CABB] text-[#5A4D41] hover:text-[#D9A441] transition-colors"
                          title="เปิดดู"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`${fileUrl}?download=1`}
                          download={att.fileName}
                          className="p-1.5 rounded-lg bg-[#D9A441] text-white hover:bg-[#C28F30] transition-colors shadow-2xs"
                          title="ดาวน์โหลด"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Read-only Rubrics Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EADBCC] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#D9A441]/15 text-[#D9A441] flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#3F342B]">
                เกณฑ์การให้คะแนน (Rubrics)
              </h2>
              <p className="text-[11px] text-[#7A6A5C]">
                ศึกษาเกณฑ์การประเมินเพื่อสร้างสรรค์ผลงานให้ตรงตามมาตรฐานของชุมนุม
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#8C5D23] bg-[#FAF0E1] px-2.5 py-1 rounded-xl">
            รวม {assignment.maxScore} คะแนน
          </span>
        </div>

        <div className="space-y-3">
          {assignment.rubrics.map((rubric, idx) => {
            const rubricScore = submission?.grade?.rubricScores.find(
              (rs) => rs.rubricId === rubric.id
            );

            return (
              <div
                key={rubric.id}
                className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#EADBCC] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#8C5D23] bg-white px-2 py-0.5 rounded-md border border-[#EADBCC]">
                      ข้อที่ {idx + 1}
                    </span>
                    <h3 className="font-bold text-[#3F342B] text-xs sm:text-sm">
                      {rubric.name}
                    </h3>
                  </div>
                  {rubric.description && (
                    <p className="text-xs text-[#6E5D4F] leading-relaxed pl-1">
                      {rubric.description}
                    </p>
                  )}
                  {rubricScore?.note && (
                    <p className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 mt-1">
                      💬 คำแนะนำครู: {rubricScore.note}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  {rubricScore !== undefined ? (
                    <div className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300">
                      ได้: {rubricScore.score} / {rubric.maxScore} คะแนน
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-[#5A4D41] bg-white px-3 py-1.5 rounded-xl border border-[#D9CABB]">
                      คะแนนเต็ม: <strong className="text-[#B94E48]">{rubric.maxScore}</strong> คะแนน
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submission Form Section */}
      <StudentSubmissionForm
        assignmentId={assignment.id}
        assignmentTitle={assignment.title}
        submissionType={assignment.submissionType}
        dueDate={assignment.dueDate}
        maxScore={assignment.maxScore}
        questions={assignment.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          hint: q.hint || undefined,
          imageKey: q.imageKey || undefined,
          imageUrl: q.imageUrl || (q.imageKey ? `/api/files/${q.imageKey}` : undefined),
          isRequired: q.isRequired,
          sortOrder: q.sortOrder,
        }))}
        initialSubmission={
          submission
            ? {
                id: submission.id,
                submissionType: submission.submissionType,
                fileKey: submission.fileKey,
                fileName: submission.fileName,
                fileSize: submission.fileSize,
                mimeType: submission.mimeType,
                linkUrl: submission.linkUrl,
                comment: submission.comment,
                submittedAt: submission.submittedAt,
                status: submission.status,
                grade: submission.grade
                  ? {
                      totalScore: submission.grade.score,
                      feedback: submission.grade.feedback,
                      gradedAt: submission.grade.gradedAt,
                    }
                  : null,
                answers: submission.answers.map((a) => ({
                  questionId: a.questionId,
                  answerText: a.answerText,
                })),
              }
            : null
        }
      />
    </div>
  );
}
