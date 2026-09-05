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
  ClipboardPaste,
  FileCheck2,
  Trash2,
} from "lucide-react";
import { validateFileMeta, getFileTypeCategory } from "@/lib/s3/file-validator";
import { requestDownloadUrlAction } from "@/actions/upload";
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
  const [isDragging, setIsDragging] = useState(false);
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
    initialSubmission &&
    (initialSubmission.status === "SUBMITTED" ||
      initialSubmission.status === "LATE" ||
      isGraded);

  // Detect Link Platform
  const getPlatformInfo = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.includes("canva.com")) {
      return { label: "Canva Design", color: "bg-cyan-50 text-cyan-800 border-cyan-200" };
    }
    if (lower.includes("drive.google.com") || lower.includes("docs.google.com")) {
      return { label: "Google Drive / Docs", color: "bg-blue-50 text-blue-800 border-blue-200" };
    }
    if (lower.includes("figma.com")) {
      return { label: "Figma Project", color: "bg-purple-50 text-purple-800 border-purple-200" };
    }
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
      return { label: "YouTube Video", color: "bg-red-50 text-red-800 border-red-200" };
    }
    if (lower.includes("github.com")) {
      return { label: "GitHub Repo", color: "bg-neutral-100 text-neutral-800 border-neutral-300" };
    }
    if (url.startsWith("http")) {
      return { label: "เว็บลิงก์ (URL)", color: "bg-amber-50 text-amber-800 border-amber-200" };
    }
    return null;
  };

  const platformInfo = linkUrl ? getPlatformInfo(linkUrl) : null;

  // Quick Paste Link from Clipboard
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
          setLinkUrl(text.trim());
          return;
        }
      }
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const processFile = (file: File) => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
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

      // 1. If FILE submission and a new file was chosen: upload to S3 via REST API (/api/upload)
      // Note: Using REST API instead of Next.js Server Action prevents Cloudflare WAF CVE-2025-55183 block
      if (submissionType === "FILE" && selectedFile) {
        const formData = new FormData();
        formData.set("file", selectedFile);
        formData.set("assignmentId", assignmentId);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadRes = await response.json();
        if (!response.ok || !uploadRes.success || !uploadRes.fileKey) {
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
        title: asDraft ? "บันทึกแบบร่างสำเร็จ" : "ส่งงานสำเร็จเรียบร้อย! 🎉",
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
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-sm space-y-4">
      {/* 1. Card Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#F2E8DC] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#D9A441]/15 text-[#D9A441] flex items-center justify-center font-bold">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#3F342B]">
              การส่งงานของคุณ (Your Work)
            </h3>
            <span className="text-[11px] text-[#7A6A5C]">
              {submissionType === "FILE" && "แนบไฟล์ผลงาน"}
              {submissionType === "LINK" && "ส่งลิงก์ URL"}
              {submissionType === "QUESTIONS" && `ตอบคำถาม (${questions.length} ข้อ)`}
            </span>
          </div>
        </div>

        {/* Status Chip */}
        <div>
          {isDraft && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              <Clock className="w-3 h-3 text-amber-700" />
              <span>แบบร่าง</span>
            </span>
          )}

          {initialSubmission && initialSubmission.status === "SUBMITTED" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              <span>ส่งแล้ว</span>
            </span>
          )}

          {initialSubmission && initialSubmission.status === "LATE" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
              <AlertTriangle className="w-3 h-3" />
              <span>ส่งช้า</span>
            </span>
          )}

          {isGraded && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Award className="w-3 h-3 text-emerald-600" />
              <span>ตรวจแล้ว</span>
            </span>
          )}

          {!initialSubmission && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>ยังไม่ส่ง</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Grade Feedback Box (If Graded) */}
      {isGraded && initialSubmission.grade && (
        <div className="bg-gradient-to-br from-[#FFF9F0] to-[#FAF0E1] border border-[#D9A441]/40 rounded-2xl p-4 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#3F342B] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#D9A441]" />
              <span>คะแนนที่ได้รับ</span>
            </h4>
            <div>
              <span className="text-2xl font-black text-[#B94E48]">
                {initialSubmission.grade.totalScore}
              </span>
              <span className="text-xs font-bold text-[#7A6A5C]"> / {maxScore} คะแนน</span>
            </div>
          </div>
          {initialSubmission.grade.feedback && (
            <div className="bg-white p-3 rounded-xl border border-[#EADBCC] text-xs text-[#4A3E33] leading-relaxed">
              <span className="font-bold text-[#3F342B] block mb-0.5">ข้อเสนอแนะจากคุณครู:</span>
              &ldquo;{initialSubmission.grade.feedback}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* 3. DRAFT ALERT BANNER */}
      {isDraft && !isEditingDraft && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Save className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-amber-950">
                คุณมีงานที่บันทึกเป็นแบบร่างไว้ (ยังไม่ส่ง)
              </h4>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                ครูยังไม่สามารถให้คะแนนได้จนกว่าคุณจะกดยืนยันส่งงานอย่างเป็นทางการ
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFormSubmit}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#D9A441] hover:bg-[#C28F30] active:scale-98 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>ยืนยันส่งงานทันที (Turn In)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditingDraft(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-950 hover:bg-amber-100 transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-700" />
              <span>แก้ไข</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. VIEW SUBMITTED WORK (When submitted officially & not in re-editing mode) */}
      {hasOfficialSubmission && !isEditingDraft ? (
        <div className="space-y-3.5">
          {/* FILE SUMMARY */}
          {submissionType === "FILE" && initialSubmission.fileKey && (
            <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] space-y-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#D9CABB] text-[#D9A441] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="text-xs font-bold text-[#3F342B] truncate">
                    {initialSubmission.fileName || "ไฟล์ผลงาน"}
                  </p>
                  <p className="text-[10px] text-[#7A6A5C]">
                    {((initialSubmission.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB •{" "}
                    {getFileTypeCategory(
                      initialSubmission.fileName || "",
                      initialSubmission.mimeType || ""
                    ).label}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenSubmittedFile}
                  disabled={isDownloading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#D9CABB] text-[#3F342B] hover:border-[#D9A441] transition-all cursor-pointer disabled:opacity-60 shadow-2xs"
                >
                  {isDownloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9A441]" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5 text-[#D9A441]" />
                  )}
                  <span>เปิดดูไฟล์</span>
                </button>

                <a
                  href={`/api/files/${initialSubmission.fileKey}?download=1`}
                  download={initialSubmission.fileName || "submission-file"}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-[#D9A441] text-white hover:bg-[#C28F30] transition-all shadow-2xs cursor-pointer"
                  title="ดาวน์โหลดไฟล์ลงเครื่อง"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด</span>
                </a>
              </div>
            </div>
          )}

          {/* LINK SUMMARY */}
          {submissionType === "LINK" && initialSubmission.linkUrl && (
            <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] space-y-2.5">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4" />
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="text-xs font-bold text-[#3F342B]">ลิงก์ที่ส่ง:</p>
                  <a
                    href={initialSubmission.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline font-mono truncate block"
                  >
                    {initialSubmission.linkUrl}
                  </a>
                </div>
              </div>

              <a
                href={initialSubmission.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs"
              >
                <span>เปิดดูลิงก์ผลงาน</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* QUESTIONS SUMMARY */}
          {submissionType === "QUESTIONS" && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#5A4D41]">คำตอบที่คุณส่งไป:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const ans = answersMap[q.id] || "(ไม่ได้ตอบข้อนี้)";
                  return (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl bg-[#FAF6F0] border border-[#EADBCC] space-y-1"
                    >
                      <p className="text-xs font-bold text-[#3F342B]">
                        ข้อ {idx + 1}: {q.questionText}
                      </p>
                      <p className="text-xs text-[#5A4D41] bg-white p-2 rounded-lg border border-[#EADBCC] whitespace-pre-wrap">
                        {ans}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submission Comment */}
          {initialSubmission.comment && (
            <div className="text-xs text-[#5A4D41] bg-[#FAF6F0] p-3 rounded-xl border border-[#EADBCC]">
              <span className="font-semibold text-[#3F342B]">ข้อความถึงครู: </span>
              {initialSubmission.comment}
            </div>
          )}

          {/* Re-submit Button (Only if not graded yet) */}
          {!isGraded && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsEditingDraft(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-[#7A6A5C] hover:text-[#3F342B] hover:bg-[#FAF6F0] border border-[#D9CABB] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>ส่งงานใหม่อีกครั้ง (Re-submit)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 5. EDITING OR NEW SUBMISSION FORM */
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* FILE UPLOAD MODE */}
          {submissionType === "FILE" && (
            <div className="space-y-2">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer space-y-2 group ${
                  isDragging
                    ? "border-[#D9A441] bg-[#FFF9F0] scale-[1.01]"
                    : "border-[#D9CABB] hover:border-[#D9A441] bg-[#FAF6F0] hover:bg-[#FFF9F0]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp,.zip,.rar,.7z"
                />

                <div className="w-10 h-10 rounded-xl bg-white border border-[#EADBCC] text-[#D9A441] group-hover:scale-110 flex items-center justify-center mx-auto transition-transform shadow-2xs">
                  <UploadCloud className="w-5 h-5" />
                </div>

                <div>
                  <p className="text-xs font-bold text-[#3F342B]">
                    {selectedFile ? (
                      <span className="text-[#D9A441]">เลือกไฟล์แล้ว: {selectedFile.name}</span>
                    ) : (
                      "ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์"
                    )}
                  </p>
                  <p className="text-[11px] text-[#7A6A5C] mt-0.5">
                    {selectedFile
                      ? `ขนาด: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                      : "รูปภาพ, PDF, Word, Excel, PowerPoint, วิดีโอ หรือ ZIP (ไม่เกิน 50MB)"}
                  </p>
                </div>
              </div>

              {/* Selected file card preview */}
              {selectedFile && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-emerald-950 truncate">
                      {selectedFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700"
                    title="ลบไฟล์ที่เลือก"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* LINK SUBMISSION MODE */}
          {submissionType === "LINK" && (
            <div className="space-y-2 bg-[#FAF6F0] p-4 rounded-2xl border border-[#EADBCC]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#3F342B] flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-[#D9A441]" />
                  <span>วางลิงก์ผลงาน (URL)</span>
                  <span className="text-red-500">*</span>
                </label>

                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8C5D23] hover:underline"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>วางจากคลิปบอร์ด</span>
                </button>
              </div>

              <input
                type="url"
                required
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://www.canva.com/... หรือ Google Drive"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9CABB] bg-white text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all font-mono"
              />

              {platformInfo && (
                <div className="flex items-center justify-between pt-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${platformInfo.color}`}
                  >
                    {platformInfo.label}
                  </span>
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-bold"
                  >
                    <span>ทดสอบเปิดลิงก์</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* QUESTIONS SUBMISSION MODE */}
          {submissionType === "QUESTIONS" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-2">
                <h4 className="text-xs font-bold text-[#5A4D41] flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#D9A441]" />
                  <span>ตอบข้อคำถาม ({questions.length} ข้อ)</span>
                </h4>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-[#FAF6F0] p-3.5 rounded-2xl border border-[#EADBCC] space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#D9A441] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-[#3F342B]">
                          {q.questionText}
                          {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </p>
                        {q.hint && (
                          <p className="text-[11px] text-[#7A6A5C] mt-0.5 italic">
                            💡 {q.hint}
                          </p>
                        )}
                      </div>
                    </div>

                    {q.imageUrl && (
                      <div className="ml-7 rounded-xl overflow-hidden border border-[#EADBCC] bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={q.imageUrl}
                          alt={`รูปภาพข้อ ${idx + 1}`}
                          className="w-full h-auto object-cover max-h-40"
                        />
                      </div>
                    )}

                    <div className="ml-7">
                      <textarea
                        rows={2}
                        required={q.isRequired}
                        value={answersMap[q.id] || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="พิมพ์คำตอบของคุณ..."
                        className="w-full px-3 py-2 rounded-xl border border-[#D9CABB] bg-white text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Comment */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#5A4D41] flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-[#A8988B]" />
              <span>หมายเหตุถึงครูผู้สอน (ถ้ามี)</span>
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="พิมพ์ข้อความบันทึกเพิ่มเติม..."
              className="w-full px-3 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all leading-relaxed"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isSavingDraft}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#D9A441] hover:bg-[#C28F30] active:scale-98 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
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

            {/* Secondary Save Draft Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting || isSavingDraft}
                onClick={handleSaveDraft}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-[#5A4D41] bg-white border border-[#D9CABB] hover:border-[#D9A441] hover:text-[#D9A441] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9A441]" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-[#D9A441]" />
                    <span>บันทึกแบบร่าง (Draft)</span>
                  </>
                )}
              </button>

              {isEditingDraft && (
                <button
                  type="button"
                  onClick={() => setIsEditingDraft(false)}
                  className="py-2 px-3 rounded-xl text-xs font-semibold text-[#7A6A5C] hover:text-[#3F342B] border border-transparent hover:border-[#D9CABB] cursor-pointer"
                >
                  ยกเลิก
                </button>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
