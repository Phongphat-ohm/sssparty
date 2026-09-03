"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  ExternalLink,
  RefreshCw,
  MessageSquare,
  Award,
  Download,
  Link2,
  HelpCircle,
  Save,
  Send,
  Edit3,
  Image as ImageIcon,
} from "lucide-react";
import { validateFileMeta, MAX_UPLOAD_SIZE, getFileTypeCategory } from "@/lib/s3/file-validator";
import { uploadFileToS3Action, requestDownloadUrlAction } from "@/actions/upload";
import { submitAssignmentAction } from "@/actions/submission";

export interface QuestionData {
  id: string;
  questionText: string;
  hint?: string;
  imageKey?: string;
  imageUrl?: string;
  isRequired: boolean;
  sortOrder: number;
}

export interface SubmissionData {
  id: string;
  submissionType: "FILE" | "LINK" | "QUESTIONS";
  fileKey?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  linkUrl?: string | null;
  comment: string | null;
  submittedAt: Date;
  status: "DRAFT" | "SUBMITTED" | "LATE" | "GRADED";
  grade?: {
    totalScore: number;
    feedback: string | null;
    gradedAt: Date;
  } | null;
  answers?: Array<{
    questionId: string;
    answerText: string;
  }>;
}

interface StudentSubmissionFormProps {
  assignmentId: string;
  assignmentTitle: string;
  submissionType: "FILE" | "LINK" | "QUESTIONS";
  dueDate: Date;
  maxScore: number;
  questions?: QuestionData[];
  initialSubmission: SubmissionData | null;
}

export function StudentSubmissionForm({
  assignmentId,
  assignmentTitle,
  submissionType = "FILE",
  dueDate,
  maxScore,
  questions = [],
  initialSubmission,
}: StudentSubmissionFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState(initialSubmission?.linkUrl || "");
  const [answersMap, setAnswersMap] = useState<Record<string, string>>({});
  const [comment, setComment] = useState(initialSubmission?.comment || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  // Initialize answers if draft or submission exists
  useEffect(() => {
    if (initialSubmission?.answers) {
      const initialMap: Record<string, string> = {};
      initialSubmission.answers.forEach((a) => {
        initialMap[a.questionId] = a.answerText;
      });
      setAnswersMap(initialMap);
    }
  }, [initialSubmission]);

  const isGraded = initialSubmission?.status === "GRADED";
  const isDraft = initialSubmission?.status === "DRAFT";
  const hasOfficialSubmission =
    initialSubmission && (initialSubmission.status === "SUBMITTED" || initialSubmission.status === "LATE" || isGraded);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileMeta({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });

    if (!validation.isValid) {
      Swal.fire({
        icon: "error",
        title: "ไฟล์ไม่ถูกต้อง",
        text: validation.error || "รูปแบบไฟล์หรือขนาดไฟล์ไม่เป็นไปตามเกณฑ์",
        confirmButtonColor: "#B94E48",
        confirmButtonText: "รับทราบ",
        background: "#FFF9F0",
        color: "#3F342B",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleAnswerChange = (questionId: string, val: string) => {
    setAnswersMap((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleOpenSubmittedFile = async () => {
    if (!initialSubmission?.fileKey) return;
    setIsDownloading(true);

    try {
      const res = await requestDownloadUrlAction(initialSubmission.fileKey);
      if (res.success && res.downloadUrl) {
        const opened = window.open(res.downloadUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          window.location.href = `/api/files/${initialSubmission.fileKey}?download=1`;
        }
      } else {
        throw new Error(res.error || "ไม่สามารถสร้างลิงก์สำหรับดูไฟล์ได้");
      }
    } catch {
      Swal.fire({
        icon: "warning",
        title: "เปิดดูไฟล์ไม่สำเร็จ",
        text: "ไม่สามารถเปิดตัวอย่างไฟล์ได้โดยตรง คุณต้องการดาวน์โหลดไฟล์ลงเครื่องแทนหรือไม่?",
        showCancelButton: true,
        confirmButtonColor: "#D9A441",
        cancelButtonColor: "#A8988B",
        confirmButtonText: "ดาวน์โหลดไฟล์",
        cancelButtonText: "ยกเลิก",
        background: "#FFF9F0",
        color: "#3F342B",
      }).then((result) => {
        if (result.isConfirmed && initialSubmission?.fileKey) {
          window.location.href = `/api/files/${initialSubmission.fileKey}?download=1`;
        }
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const executeSubmission = async (asDraft: boolean) => {
    if (asDraft) {
      setIsSavingDraft(true);
    } else {
      setIsSubmitting(true);
    }

    try {
      let fileKey = initialSubmission?.fileKey || undefined;
      let fileName = initialSubmission?.fileName || undefined;
      let fileSize = initialSubmission?.fileSize || undefined;
      let mimeType = initialSubmission?.mimeType || undefined;

      // 1. If FILE submission and a new file was chosen: upload to S3 first
      if (submissionType === "FILE" && selectedFile) {
        const formData = new FormData();
        formData.set("file", selectedFile);
        formData.set("assignmentId", assignmentId);

        const uploadRes = await uploadFileToS3Action(formData);
        if (!uploadRes.success || !uploadRes.fileKey) {
          throw new Error(uploadRes.error || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์");
        }

        fileKey = uploadRes.fileKey;
        fileName = uploadRes.fileName || selectedFile.name;
        fileSize = uploadRes.fileSize || selectedFile.size;
        mimeType = uploadRes.mimeType || selectedFile.type;
      }

      // 2. Format answers array
      const answersArray = questions.map((q) => ({
        questionId: q.id,
        answerText: answersMap[q.id] || "",
      }));

      // 3. Call Server Action
      const submitRes = await submitAssignmentAction({
        assignmentId,
        submissionType,
        fileKey,
        fileName,
        fileSize,
        mimeType,
        linkUrl: linkUrl.trim() || undefined,
        answers: answersArray,
        comment: comment.trim() || undefined,
        isDraft: asDraft,
      });

      if (!submitRes.success) {
        throw new Error(submitRes.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }

      await Swal.fire({
        icon: "success",
        title: asDraft ? "บันทึกแบบร่างสำเร็จ" : "ส่งงานสำเร็จเรียบร้อย!",
        text: submitRes.message,
        confirmButtonColor: "#D9A441",
        confirmButtonText: "ตกลง",
        background: "#FFF9F0",
        color: "#3F342B",
      });

      setIsEditingDraft(false);
      setSelectedFile(null);
      router.refresh();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: asDraft ? "บันทึกแบบร่างไม่สำเร็จ" : "การส่งงานล้มเหลว",
        text: err.message || "ระบบไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        confirmButtonColor: "#B94E48",
        confirmButtonText: "ลองใหม่",
        background: "#FFF9F0",
        color: "#3F342B",
      });
    } finally {
      setIsSubmitting(false);
      setIsSavingDraft(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const now = new Date();
    const isLate = now.getTime() > new Date(dueDate).getTime();

    Swal.fire({
      icon: isLate ? "warning" : "question",
      title: isLate ? "⚠️ ยืนยันการส่งงานล่าช้า?" : "ยืนยันการส่งงาน?",
      text: isLate
        ? "ขณะนี้เลยกำหนดส่งงานแล้ว การส่งงานครั้งนี้จะถูกบันทึกสถานะว่า 'ส่งช้ากว่ากำหนด (LATE)' คุณต้องการส่งงานหรือไม่?"
        : `คุณต้องการส่งงาน "${assignmentTitle}" ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonColor: isLate ? "#C96B4B" : "#D9A441",
      cancelButtonColor: "#A8988B",
      confirmButtonText: isLate ? "ยืนยันส่งงานล่าช้า" : "ยืนยันส่งงาน",
      cancelButtonText: "ยกเลิก",
      background: "#FFF9F0",
      color: "#3F342B",
    }).then((result) => {
      if (result.isConfirmed) {
        executeSubmission(false);
      }
    });
  };

  const handleSaveDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    executeSubmission(true);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EADBCC] shadow-xs space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2E8DC] pb-4">
        <div>
          <h3 className="text-base font-bold text-[#3F342B] flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[#D9A441]" />
            ส่งงาน (Submit Assignment)
          </h3>
          <p className="text-xs text-[#7A6A5C] mt-0.5">
            รูปแบบการส่งงาน:{" "}
            <strong className="text-[#3F342B]">
              {submissionType === "FILE" && "📁 แนบไฟล์งาน (File Upload)"}
              {submissionType === "LINK" && "🔗 ส่งลิงก์ผลงาน (URL Link)"}
              {submissionType === "QUESTIONS" && `📝 ตอบคำถาม (${questions.length} ข้อ)`}
            </strong>
          </p>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2">
          {isDraft && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>บันทึกแบบร่างไว้ (ยังไม่ส่ง)</span>
            </span>
          )}

          {initialSubmission && initialSubmission.status === "SUBMITTED" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ส่งงานตรงเวลาแล้ว</span>
            </span>
          )}

          {initialSubmission && initialSubmission.status === "LATE" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>ส่งงานล่าช้า</span>
            </span>
          )}

          {isGraded && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FAF0E1] text-[#8C5D23] border border-[#EADBCC]">
              <Award className="w-3.5 h-3.5 text-[#D9A441]" />
              <span>ตรวจและให้คะแนนแล้ว</span>
            </span>
          )}
        </div>
      </div>

      {/* Grade Feedback Box (If Graded) */}
      {isGraded && initialSubmission.grade && (
        <div className="bg-gradient-to-br from-[#FFF9F0] to-[#FAF0E1] border border-[#D9A441]/40 rounded-3xl p-6 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#3F342B] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#D9A441]" />
              ผลการประเมินจากครูผู้สอน
            </h4>
            <div className="text-right">
              <span className="text-2xl font-black text-[#B94E48]">
                {initialSubmission.grade.totalScore}
              </span>
              <span className="text-xs font-bold text-[#7A6A5C]"> / {maxScore} คะแนน</span>
            </div>
          </div>
          {initialSubmission.grade.feedback && (
            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-[#EADBCC] text-xs sm:text-sm text-[#4A3E33] leading-relaxed">
              <span className="font-bold text-[#3F342B] block mb-1">ความเห็นเพิ่มเติม:</span>
              &ldquo;{initialSubmission.grade.feedback}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* DRAFT NOTIFICATION BANNER */}
      {isDraft && !isEditingDraft && (
        <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 space-y-3 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Save className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-950">
                คุณได้บันทึกงานนี้ไว้เป็นแบบร่างแล้ว (Draft)
              </h4>
              <p className="text-xs text-amber-900 leading-relaxed">
                ข้อมูลผลงานถูกบันทึกไว้ในระบบเรียบร้อย คุณครูสามารถดูความคืบหน้าได้ แต่ยังไม่ถือว่าเป็นการส่งงานอย่างเป็นทางการและยังไม่สามารถให้คะแนนได้จนกว่าคุณจะกดยืนยันส่งงาน
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200">
            <button
              type="button"
              onClick={() => setIsEditingDraft(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-amber-300 hover:border-amber-400 text-xs font-bold text-amber-950 transition-all shadow-2xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
              <span>แก้ไขแบบร่างต่อ</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFormSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#D9A441] hover:bg-[#C28F30] text-xs font-bold text-white transition-all shadow-2xs cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>ยืนยันส่งงานทันที (Turn In)</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW SUBMITTED WORK (When submitted officially and not re-editing) */}
      {hasOfficialSubmission && !isEditingDraft ? (
        <div className="space-y-4">
          {/* FILE SUMMARY */}
          {submissionType === "FILE" && initialSubmission.fileKey && (
            <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#D9CABB] text-[#D9A441] flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-[#3F342B] truncate max-w-xs sm:max-w-md">
                      {initialSubmission.fileName || "ไฟล์ผลงาน"}
                    </p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        getFileTypeCategory(
                          initialSubmission.fileName || "",
                          initialSubmission.mimeType || ""
                        ).color
                      }`}
                    >
                      {
                        getFileTypeCategory(
                          initialSubmission.fileName || "",
                          initialSubmission.mimeType || ""
                        ).label
                      }
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A6A5C] mt-0.5">
                    ขนาด: {((initialSubmission.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB • ส่งเมื่อ:{" "}
                    {new Date(initialSubmission.submittedAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenSubmittedFile}
                  disabled={isDownloading}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white border border-[#D9CABB] text-[#3F342B] hover:border-[#D9A441] transition-all cursor-pointer disabled:opacity-60 shadow-2xs"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#D9A441]" />
                  ) : (
                    <ExternalLink className="w-4 h-4 text-[#D9A441]" />
                  )}
                  <span>เปิดดูไฟล์</span>
                </button>

                <a
                  href={`/api/files/${initialSubmission.fileKey}?download=1`}
                  download={initialSubmission.fileName || "submission-file"}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#D9A441] text-white hover:bg-[#C28F30] transition-all shadow-2xs cursor-pointer"
                  title="ดาวน์โหลดไฟล์ลงเครื่อง"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลด</span>
                </a>
              </div>
            </div>
          )}

          {/* LINK SUMMARY */}
          {submissionType === "LINK" && initialSubmission.linkUrl && (
            <div className="p-5 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] space-y-3 shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-[#3F342B]">ลิงก์ผลงานที่ส่ง:</p>
                    <a
                      href={initialSubmission.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline font-mono truncate block max-w-xs sm:max-w-lg mt-0.5"
                    >
                      {initialSubmission.linkUrl}
                    </a>
                  </div>
                </div>

                <a
                  href={initialSubmission.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                >
                  <span>เปิดดูลิงก์ผลงาน</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* QUESTIONS SUMMARY */}
          {submissionType === "QUESTIONS" && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-[#5A4D41] uppercase tracking-wider">
                คำตอบที่คุณส่งไป:
              </h4>
              <div className="space-y-3">
                {questions.map((q, idx) => {
                  const ans = answersMap[q.id] || "(ไม่ได้ตอบข้อนี้)";
                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] space-y-2 shadow-2xs"
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#D9A441] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#3F342B]">{q.questionText}</p>
                          {q.imageUrl && (
                            <div className="mt-2 w-full max-w-sm rounded-xl overflow-hidden border border-[#EADBCC] bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={q.imageUrl} alt="รูปโจทย์" className="w-full h-auto object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-[#EADBCC] text-xs sm:text-sm text-[#3F342B] whitespace-pre-wrap pl-3 ml-8">
                        {ans}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comment */}
          {initialSubmission.comment && (
            <div className="text-xs text-[#5A4D41] bg-[#FAF6F0] p-3.5 rounded-xl border border-[#EADBCC]">
              <span className="font-semibold text-[#3F342B]">ความคิดเห็นที่คุณแนบมา: </span>
              {initialSubmission.comment}
            </div>
          )}

          {/* Re-submit Button (Only if not graded yet) */}
          {!isGraded && (
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setIsEditingDraft(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#7A6A5C] hover:text-[#3F342B] hover:bg-[#FAF6F0] border border-[#D9CABB] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>ส่งงานใหม่อีกครั้ง (Re-submit)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* EDITING OR NEW SUBMISSION FORM */
        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* 1. FILE UPLOAD MODE */}
          {submissionType === "FILE" && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#D9CABB] hover:border-[#D9A441] rounded-3xl p-6 sm:p-8 text-center bg-[#FAF6F0] hover:bg-[#FFF9F0] transition-all cursor-pointer space-y-3 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp,.zip,.rar,.7z"
              />

              <div className="w-14 h-14 rounded-2xl bg-white border border-[#EADBCC] text-[#D9A441] group-hover:scale-110 flex items-center justify-center mx-auto transition-transform shadow-2xs">
                <UploadCloud className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-bold text-[#3F342B]">
                  {selectedFile ? (
                    <span className="text-[#D9A441] flex items-center justify-center gap-2">
                      <span>ไฟล์ที่เลือก: {selectedFile.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          getFileTypeCategory(selectedFile.name, selectedFile.type).color
                        }`}
                      >
                        {getFileTypeCategory(selectedFile.name, selectedFile.type).label}
                      </span>
                    </span>
                  ) : initialSubmission?.fileName ? (
                    <span className="text-[#7A6A5C]">
                      ไฟล์ปัจจุบัน: {initialSubmission.fileName} (แตะเพื่อเปลี่ยนไฟล์ใหม่)
                    </span>
                  ) : (
                    "แตะหรือคลิกเพื่อเลือกไฟล์งาน"
                  )}
                </p>
                <p className="text-xs text-[#7A6A5C]">
                  {selectedFile
                    ? `ขนาด: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                    : "รองรับทุกรูปแบบ: รูปภาพ, PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), วิดีโอ/เสียง และ ZIP"}
                </p>
                <p className="text-[11px] text-[#A8988B] pt-0.5">จำกัดขนาดสูงสุดไม่เกิน 50MB</p>
              </div>
            </div>
          )}

          {/* 2. LINK SUBMISSION MODE */}
          {submissionType === "LINK" && (
            <div className="space-y-3 bg-[#FAF6F0] p-6 rounded-3xl border border-[#EADBCC]">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-[#D9A441]" />
                  <span>กรอกลิงก์ผลงาน (URL)</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="เช่น https://www.canva.com/design/... หรือ https://drive.google.com/..."
                  className="w-full px-4 py-3 rounded-2xl border border-[#D9CABB] bg-white text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all font-mono"
                />
              </div>

              {linkUrl.trim() && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[#7A6A5C]">ตรวจสอบว่าเปิดสิทธิ์การเข้าถึงให้คุณครูเปิดดูได้แล้ว</span>
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold"
                  >
                    <span>ทดสอบเปิดลิงก์</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* 3. QUESTIONS SUBMISSION MODE */}
          {submissionType === "QUESTIONS" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-2">
                <h4 className="text-xs font-bold text-[#5A4D41] uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-[#D9A441]" />
                  <span>ตอบข้อคำถาม ({questions.length} ข้อ)</span>
                </h4>
                <span className="text-[11px] text-[#A8988B]">พิมพ์ตอบทีละข้อให้ครบถ้วน</span>
              </div>

              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-[#FAF6F0] p-5 rounded-3xl border border-[#EADBCC] space-y-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-[#D9A441] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-[#3F342B]">
                            {q.questionText}
                            {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                          </p>
                          {q.hint && (
                            <p className="text-xs text-[#7A6A5C] mt-0.5 italic">
                              💡 คำใบ้/คำอธิบาย: {q.hint}
                            </p>
                          )}
                        </div>
                      </div>

                      {q.isRequired && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full shrink-0">
                          จำเป็น
                        </span>
                      )}
                    </div>

                    {/* Question Image (If any) */}
                    {q.imageUrl && (
                      <div className="ml-9 w-full max-w-md rounded-2xl overflow-hidden border border-[#EADBCC] bg-white shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={q.imageUrl}
                          alt={`รูปภาพประกอบข้อที่ ${idx + 1}`}
                          className="w-full h-auto object-cover max-h-64"
                        />
                      </div>
                    )}

                    {/* Answer Textarea */}
                    <div className="ml-9 space-y-1">
                      <textarea
                        rows={3}
                        required={q.isRequired}
                        value={answersMap[q.id] || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="พิมพ์คำตอบของคุณที่นี่..."
                        className="w-full px-4 py-3 rounded-2xl border border-[#D9CABB] bg-white text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Comment */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#A8988B]" />
              ข้อความหรือคำอธิบายเพิ่มเติมถึงครูผู้สอน (ถ้ามี)
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="พิมพ์ข้อความบันทึก เช่น อธิบายแนวคิด หรือหมายเหตุต่างๆ..."
              className="w-full px-4 py-2.5 rounded-2xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all leading-relaxed"
            />
          </div>

          {/* Form Actions: Save Draft vs Turn In */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div>
              {isEditingDraft && (
                <button
                  type="button"
                  onClick={() => setIsEditingDraft(false)}
                  className="text-xs text-[#7A6A5C] hover:text-[#3F342B] underline cursor-pointer"
                >
                  ยกเลิกการแก้ไข
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              {/* Button 1: Save Draft */}
              <button
                type="button"
                disabled={isSubmitting || isSavingDraft}
                onClick={handleSaveDraft}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-bold text-[#5A4D41] bg-white border border-[#D9CABB] hover:border-[#D9A441] hover:text-[#D9A441] transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#D9A441]" />
                    <span>กำลังบันทึกแบบร่าง...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-[#D9A441]" />
                    <span>บันทึกแบบร่าง (Save Draft)</span>
                  </>
                )}
              </button>

              {/* Button 2: Turn In (Submit) */}
              <button
                type="submit"
                disabled={isSubmitting || isSavingDraft}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl text-xs font-bold text-white bg-[#D9A441] hover:bg-[#C28F30] active:scale-98 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>กำลังส่งงาน...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>ยืนยันส่งงาน (Turn In)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
