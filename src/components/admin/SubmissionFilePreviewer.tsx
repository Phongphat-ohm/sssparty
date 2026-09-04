"use client";

import { useState } from "react";
import {
  FileText,
  ExternalLink,
  Download,
  FileCode,
  Archive,
  Film,
  Music,
  Image as ImageIcon,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileSpreadsheet,
  Presentation,
  AlertCircle,
  RefreshCw,
  Link2,
  HelpCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getFileTypeCategory } from "@/lib/s3/file-validator";

export interface AnswerItem {
  questionId: string;
  questionText: string;
  hint?: string | null;
  imageUrl?: string | null;
  answerText: string;
}

interface SubmissionFilePreviewerProps {
  submissionType?: "FILE" | "LINK" | "QUESTIONS";
  status?: "DRAFT" | "SUBMITTED" | "LATE" | "GRADED";
  downloadUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  linkUrl?: string | null;
  answers?: AnswerItem[];
  comment: string | null;
  studentName: string;
  submittedAt: Date;
}

export function SubmissionFilePreviewer({
  submissionType = "FILE",
  status = "SUBMITTED",
  downloadUrl,
  fileName,
  fileSize,
  mimeType,
  linkUrl,
  answers = [],
  comment,
  studentName,
  submittedAt,
}: SubmissionFilePreviewerProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [hasPreviewError, setHasPreviewError] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isDraft = status === "DRAFT";

  const fileCategory = getFileTypeCategory(fileName || "", mimeType || "");
  const isPdf = fileCategory.type === "pdf";
  const isImage = fileCategory.type === "image";
  const isVideo = fileCategory.type === "video";
  const isAudio = fileCategory.type === "audio";
  const isWord = fileCategory.type === "word";
  const isExcel = fileCategory.type === "excel";
  const isPowerPoint = fileCategory.type === "powerpoint";
  const isZip = fileCategory.type === "archive";

  const fileSizeMB = fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : "0.00";

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-[#EADBCC] shadow-xs overflow-hidden">
      {/* Top Previewer Bar */}
      <div className="p-4 bg-[#FAF6F0] border-b border-[#EADBCC] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#D9CABB] flex items-center justify-center shrink-0 shadow-2xs">
            {submissionType === "LINK" ? (
              <Link2 className="w-5 h-5 text-blue-600" />
            ) : submissionType === "QUESTIONS" ? (
              <HelpCircle className="w-5 h-5 text-purple-600" />
            ) : (
              <>
                {isPdf && <FileText className="w-5 h-5 text-red-600" />}
                {isImage && <ImageIcon className="w-5 h-5 text-amber-500" />}
                {isVideo && <Film className="w-5 h-5 text-rose-600" />}
                {isAudio && <Music className="w-5 h-5 text-teal-600" />}
                {isWord && <FileText className="w-5 h-5 text-blue-600" />}
                {isExcel && <FileSpreadsheet className="w-5 h-5 text-emerald-600" />}
                {isPowerPoint && <Presentation className="w-5 h-5 text-orange-600" />}
                {isZip && <Archive className="w-5 h-5 text-purple-600" />}
                {!isPdf && !isImage && !isVideo && !isAudio && !isWord && !isExcel && !isPowerPoint && !isZip && (
                  <FileCode className="w-5 h-5 text-[#5A4D41]" />
                )}
              </>
            )}
          </div>

          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-[#3F342B] truncate max-w-[180px] sm:max-w-xs">
                {submissionType === "LINK"
                  ? "ลิงก์ผลงานภายนอก"
                  : submissionType === "QUESTIONS"
                  ? `คำตอบของนักเรียน (${answers.length} ข้อ)`
                  : fileName || "ไฟล์ผลงาน"}
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  submissionType === "LINK"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : submissionType === "QUESTIONS"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : fileCategory.color
                }`}
              >
                {submissionType === "LINK"
                  ? "ลิงก์ URL"
                  : submissionType === "QUESTIONS"
                  ? "ตอบคำถาม"
                  : fileCategory.label}
              </span>

              {isDraft && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  📝 แบบร่าง (Draft)
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#7A6A5C]">
              {submissionType === "FILE" && `${fileSizeMB} MB • `}ส่งโดย {studentName}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5">
          {submissionType === "FILE" && downloadUrl && (
            <>
              {isImage && !hasPreviewError && (
                <>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                    className="p-1.5 rounded-lg bg-white border border-[#D9CABB] text-[#5A4D41] hover:text-[#D9A441] transition-colors cursor-pointer"
                    title="ย่อภาพ"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                    className="p-1.5 rounded-lg bg-white border border-[#D9CABB] text-[#5A4D41] hover:text-[#D9A441] transition-colors cursor-pointer"
                    title="ขยายภาพ"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1.5 rounded-lg bg-white border border-[#D9CABB] text-[#5A4D41] hover:text-[#D9A441] transition-colors cursor-pointer"
                    title="หมุนภาพ"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#D9CABB] text-xs font-semibold text-[#3F342B] hover:border-[#D9A441] hover:text-[#D9A441] transition-all shadow-2xs"
                title="เปิดดูในแท็บใหม่"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">เปิดเต็มจอ</span>
              </a>

              <a
                href={downloadUrl}
                download={fileName || "student-work"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D9A441] text-white text-xs font-bold hover:bg-[#C28F30] transition-all shadow-2xs cursor-pointer"
                title="ดาวน์โหลดไฟล์ลงเครื่อง"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด</span>
              </a>
            </>
          )}

          {submissionType === "LINK" && linkUrl && (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-2xs cursor-pointer"
            >
              <span>เปิดดูลิงก์</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Collapse/Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D9CABB] text-xs font-semibold text-[#5A4D41] hover:border-[#D9A441] hover:text-[#D9A441] transition-all shadow-2xs cursor-pointer"
            title={isCollapsed ? "แสดงตัวอย่างผลงาน" : "ย่อเก็บตัวอย่างผลงาน"}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>แสดงตัวอย่าง</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-[#7A6A5C]" />
                <span className="hidden sm:inline">ย่อเก็บ</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>

      {/* Draft Notification in Previewer */}
      {isDraft && (
        <div className="p-3 bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" />
          <span>นักเรียนกำลังจัดทำชิ้นงานนี้ (สถานะแบบร่าง) — คุณครูสามารถดูข้อมูลได้ แต่ยังไม่สามารถให้คะแนนได้</span>
        </div>
      )}

      {/* Main Preview Screen Area */}
      <div className="flex-1 bg-[#1F1B18] relative min-h-[380px] sm:min-h-[480px] flex items-center justify-center p-2 overflow-auto">
        {/* CASE A: LINK SUBMISSION */}
        {submissionType === "LINK" && (
          <div className="w-full max-w-lg p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg">
              <Link2 className="w-9 h-9" />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-blue-300 bg-blue-900/40 px-3 py-1 rounded-full border border-blue-400/30">
                ลิงก์ผลงานภายนอก (External Project Link)
              </span>
              <h5 className="font-bold text-white text-base truncate pt-1">ผลงานของ {studentName}</h5>
              <p className="text-xs text-white/70 font-mono bg-black/40 p-3 rounded-xl break-all text-left">
                {linkUrl || "(ไม่ได้ระบุลิงก์)"}
              </p>
            </div>

            {linkUrl && (
              <div className="pt-2">
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xl transition-all active:scale-98 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>คลิกเพื่อเปิดดูผลงานในแท็บใหม่</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* CASE B: QUESTIONS SUBMISSION */}
        {submissionType === "QUESTIONS" && (
          <div className="w-full max-w-2xl p-4 sm:p-6 space-y-4 max-h-[600px] overflow-y-auto">
            <div className="text-center pb-2">
              <span className="text-xs font-bold text-purple-300 bg-purple-900/40 px-3 py-1 rounded-full border border-purple-400/30">
                คำตอบของนักเรียน ({answers.length} ข้อ)
              </span>
            </div>

            {answers.length === 0 ? (
              <div className="p-8 text-center bg-white/10 rounded-2xl text-white/70 text-xs">
                ยังไม่มีข้อมูลคำตอบที่บันทึก
              </div>
            ) : (
              answers.map((a, idx) => (
                <div
                  key={a.questionId || idx}
                  className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5 space-y-3 shadow-md text-left"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-[#D9A441] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                      {idx + 1}
                    </span>
                    <div className="space-y-1">
                      <h5 className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                        {a.questionText}
                      </h5>
                      {a.hint && (
                        <p className="text-[11px] text-white/60 italic">💡 คำใบ้: {a.hint}</p>
                      )}
                    </div>
                  </div>

                  {/* Question Image (If any) */}
                  {a.imageUrl && (
                    <div className="ml-8 w-full max-w-sm rounded-xl overflow-hidden border border-white/20 bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.imageUrl}
                        alt={`รูปโจทย์ข้อที่ ${idx + 1}`}
                        className="w-full h-auto object-cover max-h-48"
                      />
                    </div>
                  )}

                  {/* Student Answer Card */}
                  <div className="ml-8 p-3.5 bg-white rounded-xl text-xs sm:text-sm text-[#3F342B] font-medium leading-relaxed shadow-sm">
                    <span className="text-[10px] font-bold text-[#8C5D23] block mb-1">
                      คำตอบของนักเรียน:
                    </span>
                    <p className="whitespace-pre-wrap">{a.answerText || "(ไม่ได้ตอบข้อนี้)"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CASE C: FILE SUBMISSION */}
        {submissionType === "FILE" && (
          <>
            {!downloadUrl ? (
              <div className="p-8 text-center bg-white/10 rounded-2xl text-white/70 text-xs">
                ยังไม่มีไฟล์ที่บันทึก
              </div>
            ) : hasPreviewError ? (
              <div className="p-8 text-center bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 max-w-md space-y-4 shadow-2xl animate-in fade-in">
                <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-lg">
                  <AlertCircle className="w-9 h-9" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-amber-200 bg-amber-950/50 px-3 py-0.5 rounded-full border border-amber-400/30">
                    เบราว์เซอร์ไม่สามารถแสดงตัวอย่างไฟล์นี้ได้โดยตรง
                  </span>
                  <h5 className="font-bold text-white text-base truncate pt-1">{fileName}</h5>
                  <p className="text-xs text-white/70">
                    ขนาดไฟล์: {fileSizeMB} MB • {fileCategory.label}
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <a
                    href={downloadUrl}
                    download={fileName || "submission-file"}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#D9A441] hover:bg-[#C28F30] text-white font-bold text-xs sm:text-sm shadow-xl transition-all active:scale-98 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลดไฟล์นี้เพื่อเปิดตรวจ</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setHasPreviewError(false)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ลองโหลดตัวอย่างใหม่อีกครั้ง</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 1. PDF Preview */}
                {isPdf && (
                  <div className="w-full h-full min-h-[460px] flex flex-col relative">
                    <iframe
                      src={`${downloadUrl}#toolbar=1&navpanes=0`}
                      className="w-full h-full min-h-[460px] rounded-2xl border-0 bg-white"
                      title="PDF Preview"
                    />
                    <div className="p-2 text-center bg-[#2A2420] text-[11px] text-[#C5B7A8] flex items-center justify-center gap-2">
                      <span>หากเบราว์เซอร์ไม่แสดงเอกสาร PDF:</span>
                      <a
                        href={downloadUrl}
                        download={fileName || "report.pdf"}
                        className="text-[#D9A441] hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>คลิกเพื่อดาวน์โหลดไฟล์</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* 2. Image Preview */}
                {isImage && (
                  <div className="flex items-center justify-center w-full h-full p-4 overflow-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={downloadUrl}
                      alt={fileName || "รูปผลงาน"}
                      onError={() => setHasPreviewError(true)}
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transition: "transform 0.2s ease-in-out",
                      }}
                      className="max-h-[500px] max-w-full object-contain rounded-xl shadow-2xl drop-shadow-md"
                    />
                  </div>
                )}

                {/* 3. HTML5 Video Player */}
                {isVideo && (
                  <div className="w-full max-w-2xl p-4 flex flex-col items-center">
                    <video
                      controls
                      src={downloadUrl}
                      onError={() => setHasPreviewError(true)}
                      className="w-full max-h-[460px] rounded-2xl shadow-xl bg-black"
                    >
                      เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอ HTML5
                    </video>
                  </div>
                )}

                {/* 4. HTML5 Audio Player */}
                {isAudio && (
                  <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-teal-500 text-white flex items-center justify-center mx-auto shadow-lg">
                      <Music className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white truncate">{fileName}</p>
                      <p className="text-xs text-white/70">ไฟล์เสียงผลงานนักเรียน</p>
                    </div>
                    <audio
                      controls
                      src={downloadUrl}
                      onError={() => setHasPreviewError(true)}
                      className="w-full"
                    >
                      เบราว์เซอร์ของคุณไม่รองรับการเล่นเสียง HTML5
                    </audio>
                  </div>
                )}

                {/* 5. Microsoft Word Documents */}
                {isWord && (
                  <div className="p-8 text-center bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 max-w-md space-y-4 shadow-xl">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg">
                      <FileText className="w-9 h-9" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-blue-300 bg-blue-900/40 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                        Microsoft Word Document
                      </span>
                      <h5 className="font-bold text-white text-base truncate pt-1">{fileName}</h5>
                      <p className="text-xs text-white/70">ขนาดไฟล์: {fileSizeMB} MB</p>
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                      <a
                        href={downloadUrl}
                        download={fileName || "document.docx"}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>ดาวน์โหลดไฟล์ Word เพื่อตรวจงาน</span>
                      </a>
                      <a
                        href={`https://docs.google.com/viewer?url=${encodeURIComponent(downloadUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>เปิดดูผ่าน Google Docs Viewer</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* 6. Microsoft Excel Spreadsheets */}
                {isExcel && (
                  <div className="p-8 text-center bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 max-w-md space-y-4 shadow-xl">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg">
                      <FileSpreadsheet className="w-9 h-9" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-emerald-300 bg-emerald-900/40 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                        Microsoft Excel Spreadsheet
                      </span>
                      <h5 className="font-bold text-white text-base truncate pt-1">{fileName}</h5>
                      <p className="text-xs text-white/70">ขนาดไฟล์: {fileSizeMB} MB</p>
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                      <a
                        href={downloadUrl}
                        download={fileName || "spreadsheet.xlsx"}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>ดาวน์โหลดไฟล์ Excel เพื่อตรวจงาน</span>
                      </a>
                      <a
                        href={`https://docs.google.com/viewer?url=${encodeURIComponent(downloadUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>เปิดดูผ่าน Google Sheets Viewer</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* 7. Microsoft PowerPoint Presentations */}
                {isPowerPoint && (
                  <div className="p-8 text-center bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 max-w-md space-y-4 shadow-xl">
                    <div className="w-16 h-16 rounded-2xl bg-orange-600 text-white flex items-center justify-center mx-auto shadow-lg">
                      <Presentation className="w-9 h-9" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-orange-300 bg-orange-900/40 px-2.5 py-0.5 rounded-full border border-orange-400/30">
                        Microsoft PowerPoint Presentation
                      </span>
                      <h5 className="font-bold text-white text-base truncate pt-1">{fileName}</h5>
                      <p className="text-xs text-white/70">ขนาดไฟล์: {fileSizeMB} MB</p>
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                      <a
                        href={downloadUrl}
                        download={fileName || "presentation.pptx"}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>ดาวน์โหลดไฟล์สไลด์นำเสนอ</span>
                      </a>
                      <a
                        href={`https://docs.google.com/viewer?url=${encodeURIComponent(downloadUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>เปิดดูผ่าน Google Slides Viewer</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* 8. Archives (ZIP / RAR / 7Z) */}
                {isZip && (
                  <div className="p-8 text-center bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 max-w-md space-y-4 shadow-xl">
                    <div className="w-16 h-16 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-lg">
                      <Archive className="w-9 h-9" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-purple-300 bg-purple-900/40 px-2.5 py-0.5 rounded-full border border-purple-400/30">
                        ไฟล์บีบอัด Archive (ZIP)
                      </span>
                      <h5 className="font-bold text-white text-base truncate pt-1">{fileName}</h5>
                      <p className="text-xs text-white/70">ขนาดไฟล์: {fileSizeMB} MB</p>
                    </div>
                    <div className="pt-2">
                      <a
                        href={downloadUrl}
                        download={fileName || "archive.zip"}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>ดาวน์โหลดไฟล์ ZIP เพื่อแตกไฟล์ตรวจ</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* 9. Other file types */}
                {!isPdf && !isImage && !isVideo && !isAudio && !isWord && !isExcel && !isPowerPoint && !isZip && (
                  <div className="p-8 text-center bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 max-w-md space-y-4 shadow-xl">
                    <div className="w-16 h-16 rounded-2xl bg-[#5A4D41] text-white flex items-center justify-center mx-auto shadow-lg">
                      <FileCode className="w-9 h-9" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-bold text-white text-base truncate">{fileName}</h5>
                      <p className="text-xs text-white/70">ขนาดไฟล์: {fileSizeMB} MB</p>
                    </div>
                    <a
                      href={downloadUrl}
                      download={fileName || "file"}
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#D9A441] hover:bg-[#C28F30] text-white font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>ดาวน์โหลดไฟล์</span>
                    </a>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Student Comment Card at Bottom */}
      <div className="p-4 bg-[#FFF9F0] border-t border-[#EADBCC] space-y-1">
        <p className="text-xs font-bold text-[#3F342B] flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-[#D9A441]" />
          ข้อความแนบจากนักเรียน ({studentName}):
        </p>
        <p className="text-xs text-[#5A4D41] italic pl-5 leading-relaxed">
          {comment ? `"${comment}"` : "(ไม่ได้แนบข้อความเพิ่มเติม)"}
        </p>
      </div>
      </>
      )}
    </div>
  );
}
