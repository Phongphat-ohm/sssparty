"use client";

import { useState } from "react";
import Link from "next/link";
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
  Send,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  StudentSubmissionForm,
  SubmissionData,
  QuestionData,
} from "@/components/student/StudentSubmissionForm";
import { MarkdownViewer } from "@/components/ui/MarkdownViewer";
import { getFileTypeCategory } from "@/lib/s3/file-validator";

interface AttachmentItem {
  id: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
}

interface RubricScoreItem {
  rubricId: string;
  score: number;
  note?: string | null;
}

interface RubricItem {
  id: string;
  name: string;
  description: string | null;
  maxScore: number;
  sortOrder: number;
}

interface StudentAssignmentViewClientProps {
  assignment: {
    id: string;
    title: string;
    description: string;
    submissionType: "FILE" | "LINK" | "QUESTIONS";
    status?: "DRAFT" | "PUBLISHED" | "CLOSED";
    dueDate: Date;
    maxScore: number;
    attachments: AttachmentItem[];
    rubrics: RubricItem[];
    questions: QuestionData[];
  };
  submission: SubmissionData | null;
  isPastDue: boolean;
}

export function StudentAssignmentViewClient({
  assignment,
  submission,
  isPastDue,
}: StudentAssignmentViewClientProps) {
  const isReturned = submission?.status === "RETURNED";
  const isGraded = submission?.status === "GRADED";
  const isSubmitted = submission?.status === "SUBMITTED" || submission?.status === "LATE";

  // Mobile Tab state: "work" (Your Work) or "instructions" (Assignment Details & Rubrics)
  const [activeMobileTab, setActiveMobileTab] = useState<"work" | "instructions">(
    isReturned || isSubmitted || isGraded ? "work" : "work"
  );

  // Description collapse/expand state (clamped for long descriptions)
  const isLongDescription = (assignment.description || "").length > 250;
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(!isLongDescription);

  // Rubrics accordion state (default open if graded, closed if unsubmitted to save space)
  const [isRubricsExpanded, setIsRubricsExpanded] = useState(isGraded);

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-8">
      {/* 1. Header & Quick Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#EADBCC] shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/student/assignments"
            className="p-2.5 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] text-[#7A6A5C] hover:text-[#3F342B] hover:border-[#D9A441] transition-all shadow-2xs shrink-0"
            title="กลับหน้ารวมงาน"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-[#8C5D23] uppercase tracking-wider">
                ภาระงาน
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
                {assignment.submissionType === "FILE" && "📁 แนบไฟล์"}
                {assignment.submissionType === "LINK" && "🔗 ส่งลิงก์"}
                {assignment.submissionType === "QUESTIONS" &&
                  `📝 ตอบคำถาม (${assignment.questions.length} ข้อ)`}
              </span>

              {isReturned && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1 animate-pulse">
                  <RotateCcw className="w-3 h-3" />
                  ถูกตีกลับ (ต้องส่งใหม่)
                </span>
              )}

              {assignment.status === "CLOSED" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  ปิดรับงานแล้ว
                </span>
              )}
            </div>

            <h1 className="text-base sm:text-xl font-extrabold text-[#3F342B] tracking-tight truncate mt-0.5">
              {assignment.title}
            </h1>
          </div>
        </div>

        {/* Quick Deadline & Score Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-[#FAF0E1] text-[#8C5D23] border border-[#EADBCC]">
            เต็ม {assignment.maxScore} คะแนน
          </span>

          <span className="text-xs text-[#7A6A5C] flex items-center gap-1 bg-[#FAF6F0] px-3 py-1 rounded-xl border border-[#EADBCC]">
            <Clock className="w-3.5 h-3.5 text-[#C96B4B]" />
            <span>
              {new Date(assignment.dueDate).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </span>
        </div>
      </div>

      {/* 2. MOBILE TAB SWITCHER (Hidden on Desktop) */}
      <div className="lg:hidden flex rounded-2xl bg-[#FAF6F0] p-1.5 border border-[#EADBCC] shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveMobileTab("work")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeMobileTab === "work"
              ? "bg-white text-[#3F342B] shadow-xs border border-[#D9CABB]"
              : "text-[#7A6A5C] hover:text-[#3F342B]"
          }`}
        >
          {isReturned ? (
            <RotateCcw className="w-3.5 h-3.5 text-orange-600 animate-spin-reverse" />
          ) : (
            <Send className="w-3.5 h-3.5 text-[#D9A441]" />
          )}
          <span>ส่งผลงาน (Your Work)</span>
          {isReturned && (
            <span className="w-2 h-2 rounded-full bg-orange-600 animate-ping" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveMobileTab("instructions")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeMobileTab === "instructions"
              ? "bg-white text-[#3F342B] shadow-xs border border-[#D9CABB]"
              : "text-[#7A6A5C] hover:text-[#3F342B]"
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-[#8C5D23]" />
          <span>คำสั่งและเกณฑ์ประเมิน</span>
          {assignment.attachments.length > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full">
              {assignment.attachments.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. TWO-COLUMN LAYOUT ON DESKTOP / CONDITIONAL ON MOBILE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* LEFT COLUMN: Instructions, Attachments, Rubrics */}
        <div
          className={`lg:col-span-7 xl:col-span-8 space-y-4 sm:space-y-5 ${
            activeMobileTab === "work" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Assignment Description Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A6A5C] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>คำสั่งและรายละเอียดภาระงาน</span>
              </h2>

              {isPastDue && !submission && (
                <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>เลยกำหนดส่ง</span>
                </span>
              )}
            </div>

            {/* Clamped Markdown Description */}
            <div className="relative">
              <div
                className={`bg-[#FAF6F0] p-4 sm:p-5 rounded-2xl border border-[#EADBCC] transition-all duration-300 ${
                  !isDescriptionExpanded ? "max-h-56 sm:max-h-72 overflow-hidden" : ""
                }`}
              >
                <MarkdownViewer content={assignment.description} />
              </div>

              {/* Gradient Mask & Read More button when clamped */}
              {isLongDescription && !isDescriptionExpanded && (
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#FAF6F0] via-[#FAF6F0]/85 to-transparent rounded-b-2xl flex items-end justify-center pb-2.5">
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white text-xs font-bold text-[#8C5D23] border border-[#D9CABB] hover:border-[#D9A441] shadow-2xs transition-all cursor-pointer"
                  >
                    <span>อ่านคำสั่งทั้งหมด (ดูเพิ่มเติม)</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Collapse button when expanded */}
            {isLongDescription && isDescriptionExpanded && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-[#7A6A5C] hover:text-[#3F342B] bg-[#FAF6F0] border border-[#EADBCC] transition-all cursor-pointer"
                >
                  <span>ย่อรายละเอียดคำสั่ง</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Teacher Attachments (Compact & Clean) */}
            {assignment.attachments.length > 0 && (
              <div className="space-y-2.5 pt-3 border-t border-[#F2E8DC]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#3F342B] flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#D9A441]" />
                    <span>เอกสารประกอบโจทย์ ({assignment.attachments.length} รายการ)</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {assignment.attachments.map((att) => {
                    const cat = getFileTypeCategory(att.fileName, att.mimeType);
                    const isImg = cat.type === "image";
                    const fileUrl = `/api/files/${att.fileKey}`;

                    return (
                      <div
                        key={att.id}
                        className="p-2.5 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] flex items-center justify-between gap-2.5 shadow-2xs hover:border-[#D9A441] transition-all"
                      >
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                          {isImg ? (
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-black/5 border border-[#EADBCC] shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={fileUrl}
                                alt={att.fileName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-white border border-[#EADBCC] flex items-center justify-center shrink-0">
                              {cat.type === "pdf" && <FileText className="w-4 h-4 text-red-500" />}
                              {cat.type === "word" && <FileText className="w-4 h-4 text-blue-500" />}
                              {cat.type === "excel" && <FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
                              {cat.type === "powerpoint" && <Presentation className="w-4 h-4 text-orange-500" />}
                              {cat.type === "archive" && <Archive className="w-4 h-4 text-purple-500" />}
                              {!["pdf", "word", "excel", "powerpoint", "archive"].includes(cat.type) && (
                                <FileText className="w-4 h-4 text-[#5A4D41]" />
                              )}
                            </div>
                          )}

                          <div className="overflow-hidden min-w-0">
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
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Rubrics Criteria Card */}
          {assignment.rubrics.length > 0 && (
            <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setIsRubricsExpanded(!isRubricsExpanded)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-[#FAF6F0]/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-[#D9A441]/15 text-[#D9A441] flex items-center justify-center shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-bold text-[#3F342B] truncate">
                      เกณฑ์การให้คะแนน (Rubrics)
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-[#7A6A5C]">
                      {assignment.rubrics.length} เกณฑ์ประเมิน • รวม {assignment.maxScore} คะแนน
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-semibold text-[#8C5D23] bg-[#FAF0E1] px-2.5 py-0.5 rounded-lg hidden sm:inline">
                    {isRubricsExpanded ? "ซ่อนเกณฑ์" : "คลิกดูเกณฑ์ประเมิน"}
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-[#FAF6F0] border border-[#EADBCC] flex items-center justify-center text-[#7A6A5C]">
                    {isRubricsExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>

              {/* Rubric Items (Visible when expanded) */}
              {isRubricsExpanded && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 space-y-2.5 border-t border-[#F2E8DC] animate-in slide-in-from-top-2 duration-200">
                  {assignment.rubrics.map((rubric, idx) => {
                    const rubricScore = submission?.grade?.rubricScores?.find(
                      (rs) => rs.rubricId === rubric.id
                    );

                    return (
                      <div
                        key={rubric.id}
                        className="p-3 bg-[#FAF6F0] rounded-2xl border border-[#EADBCC] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="space-y-0.5 max-w-xl">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-[#8C5D23] bg-white px-1.5 py-0.2 rounded-md border border-[#EADBCC]">
                              ข้อ {idx + 1}
                            </span>
                            <h3 className="font-bold text-[#3F342B] text-xs">
                              {rubric.name}
                            </h3>
                          </div>
                          {rubric.description && (
                            <p className="text-[11px] text-[#6E5D4F] leading-relaxed pl-1">
                              {rubric.description}
                            </p>
                          )}
                          {rubricScore?.note && (
                            <p className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 mt-1">
                              💬 ข้อเสนอแนะ: {rubricScore.note}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          {rubricScore !== undefined ? (
                            <div className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-xl border border-emerald-300">
                              ได้: {rubricScore.score} / {rubric.maxScore} คะแนน
                            </div>
                          ) : (
                            <div className="text-[11px] font-semibold text-[#5A4D41] bg-white px-2 py-0.5 rounded-lg border border-[#D9CABB]">
                              เต็ม <strong className="text-[#B94E48]">{rubric.maxScore}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SUBMISSION FORM (col-span-5 / 4) */}
        <div
          id="submission-panel"
          className={`lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20 space-y-4 max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto ${
            activeMobileTab === "instructions" ? "hidden lg:block" : "block"
          }`}
        >
          <StudentSubmissionForm
            assignmentId={assignment.id}
            assignmentTitle={assignment.title}
            submissionType={assignment.submissionType}
            dueDate={assignment.dueDate}
            maxScore={assignment.maxScore}
            questions={assignment.questions}
            initialSubmission={submission}
            isClosed={assignment.status === "CLOSED"}
          />
        </div>
      </div>
    </div>
  );
}
