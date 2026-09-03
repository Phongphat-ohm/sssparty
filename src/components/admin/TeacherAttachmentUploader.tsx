"use client";

import { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Trash2,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  ExternalLink,
  FileSpreadsheet,
  Presentation,
  Archive,
} from "lucide-react";
import { uploadTeacherMaterialAction } from "@/actions/upload";
import { getFileTypeCategory } from "@/lib/s3/file-validator";

export interface TeacherAttachmentItem {
  id?: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  publicUrl?: string;
}

interface TeacherAttachmentUploaderProps {
  attachments: TeacherAttachmentItem[];
  onChange: (attachments: TeacherAttachmentItem[]) => void;
}

export function TeacherAttachmentUploader({
  attachments,
  onChange,
}: TeacherAttachmentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const newAttachments: TeacherAttachmentItem[] = [...attachments];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.set("file", file);
        formData.set("folder", "materials");

        const res = await uploadTeacherMaterialAction(formData);
        if (!res.success || !res.fileKey) {
          throw new Error(res.error || `อัปโหลดไฟล์ ${file.name} ไม่สำเร็จ`);
        }

        newAttachments.push({
          fileKey: res.fileKey,
          fileName: res.fileName || file.name,
          fileSize: res.fileSize || file.size,
          mimeType: res.mimeType || file.type,
          publicUrl: res.publicUrl,
        });
      }

      onChange(newAttachments);
    } catch (err: any) {
      setErrorMessage(err.message || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    const updated = attachments.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-[#D9A441]" />
          <span>แนบไฟล์เอกสาร / รูปภาพประกอบโจทย์สำหรับนักเรียน (ถ้ามี)</span>
        </label>
        <span className="text-[11px] text-[#A8988B]">
          {attachments.length > 0 ? `แนบแล้ว ${attachments.length} ไฟล์` : "ตัวอย่าง: รูปโจทย์, ใบงาน PDF"}
        </span>
      </div>

      {errorMessage && (
        <p className="text-xs text-[#B94E48] bg-red-50 p-2.5 rounded-xl border border-red-200 font-semibold">
          ⚠️ {errorMessage}
        </p>
      )}

      {/* Upload Zone */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed border-[#D9CABB] hover:border-[#D9A441] rounded-2xl p-4 sm:p-5 text-center bg-[#FAF6F0] hover:bg-[#FFF9F0] transition-all cursor-pointer space-y-2 group ${
          isUploading ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
        />

        <div className="w-10 h-10 rounded-xl bg-white border border-[#EADBCC] text-[#D9A441] group-hover:scale-105 flex items-center justify-center mx-auto transition-transform shadow-2xs">
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#D9A441]" />
          ) : (
            <UploadCloud className="w-5 h-5" />
          )}
        </div>

        <div className="space-y-0.5">
          <p className="text-xs font-bold text-[#3F342B]">
            {isUploading ? "กำลังอัปโหลดไฟล์..." : "คลิกหรือลากไฟล์มาวางเพื่อแนบไฟล์โจทย์"}
          </p>
          <p className="text-[11px] text-[#7A6A5C]">
            รองรับรูปภาพโจทย์ (PNG, JPG), เอกสารใบงาน (PDF, Word, Excel, PPT) และ ZIP สูงสุด 50MB
          </p>
        </div>
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2 pt-1">
          {attachments.map((item, idx) => {
            const cat = getFileTypeCategory(item.fileName, item.mimeType);
            const isImg = cat.type === "image";
            const sizeMB = (item.fileSize / (1024 * 1024)).toFixed(2);

            return (
              <div
                key={item.id || item.fileKey || idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#EADBCC] shadow-2xs gap-3 hover:border-[#D9A441]/50 transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {isImg && item.publicUrl ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#EADBCC] bg-[#FAF6F0] shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.publicUrl}
                        alt={item.fileName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#FAF6F0] border border-[#EADBCC] flex items-center justify-center shrink-0">
                      {cat.type === "image" && <ImageIcon className="w-5 h-5 text-amber-500" />}
                      {cat.type === "pdf" && <FileText className="w-5 h-5 text-red-500" />}
                      {cat.type === "word" && <FileText className="w-5 h-5 text-blue-500" />}
                      {cat.type === "excel" && <FileSpreadsheet className="w-5 h-5 text-emerald-500" />}
                      {cat.type === "powerpoint" && <Presentation className="w-5 h-5 text-orange-500" />}
                      {cat.type === "archive" && <Archive className="w-5 h-5 text-purple-500" />}
                      {!["image", "pdf", "word", "excel", "powerpoint", "archive"].includes(cat.type) && (
                        <FileText className="w-5 h-5 text-[#5A4D41]" />
                      )}
                    </div>
                  )}

                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#3F342B] truncate max-w-xs sm:max-w-md">
                        {item.fileName}
                      </p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${cat.color}`}>
                        {cat.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#A8988B]">{sizeMB} MB</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.publicUrl && (
                    <a
                      href={item.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-[#7A6A5C] hover:text-[#D9A441] hover:bg-[#FAF6F0] transition-colors"
                      title="เปิดดูไฟล์"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 rounded-lg text-[#B94E48] hover:bg-red-50 transition-colors cursor-pointer"
                    title="ลบไฟล์แนบนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
