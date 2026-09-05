"use client";

import { useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";

export interface AssignmentQuestionItem {
  id?: string;
  questionText: string;
  hint?: string;
  imageKey?: string;
  imageUrl?: string;
  isRequired: boolean;
  sortOrder: number;
}

interface QuestionBuilderProps {
  questions: AssignmentQuestionItem[];
  onChange: (questions: AssignmentQuestionItem[]) => void;
}

export function QuestionBuilder({ questions, onChange }: QuestionBuilderProps) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);

  const handleAddQuestion = () => {
    const nextOrder = questions.length + 1;
    const newQuestion: AssignmentQuestionItem = {
      questionText: "",
      hint: "",
      isRequired: true,
      sortOrder: nextOrder,
    };
    onChange([...questions, newQuestion]);
  };

  const handleUpdate = (index: number, updates: Partial<AssignmentQuestionItem>) => {
    const updated = questions.map((q, idx) => (idx === index ? { ...q, ...updates } : q));
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    const filtered = questions.filter((_, idx) => idx !== index);
    const reordered = filtered.map((q, idx) => ({ ...q, sortOrder: idx + 1 }));
    onChange(reordered);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const nextList = [...questions];
    const temp = nextList[index];
    nextList[index] = nextList[targetIdx];
    nextList[targetIdx] = temp;

    const reordered = nextList.map((q, idx) => ({ ...q, sortOrder: idx + 1 }));
    onChange(reordered);
  };

  const triggerUploadImage = (index: number) => {
    setCurrentImageIndex(index);
    fileInputRef.current?.click();
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || currentImageIndex === null) return;

    setUploadingIndex(currentImageIndex);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "question-images");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const res = await response.json();
      if (response.ok && res.success && res.fileKey && res.publicUrl) {
        handleUpdate(currentImageIndex, {
          imageKey: res.fileKey,
          imageUrl: res.publicUrl,
        });
      } else {
        alert(res.error || "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพคำถาม");
      }
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    } finally {
      setUploadingIndex(null);
      setCurrentImageIndex(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input for question image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F2E8DC] pb-3">
        <div>
          <h3 className="text-sm font-bold text-[#3F342B] flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-[#D9A441]" />
            <span>ชุดข้อคำถามสำหรับการบ้าน (Questions Builder)</span>
          </h3>
          <p className="text-xs text-[#7A6A5C]">
            สร้างข้อคำถามให้นักเรียนพิมพ์ตอบ สามารถแนบรูปภาพในแต่ละข้อได้
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddQuestion}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D9A441] hover:bg-[#C28F30] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>เพิ่มข้อคำถาม</span>
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="p-8 text-center bg-[#FAF6F0] rounded-2xl border-2 border-dashed border-[#D9CABB] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#EADBCC] text-[#D9A441] flex items-center justify-center mx-auto shadow-2xs">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-[#3F342B]">ยังไม่มีข้อคำถามในภาระงานนี้</p>
            <p className="text-xs text-[#7A6A5C]">
              คลิกปุ่ม &quot;เพิ่มข้อคำถาม&quot; ด้านบนเพื่อเริ่มสร้างโจทย์คำถามและแนบรูปภาพประกอบข้อ
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddQuestion}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#D9CABB] text-xs font-bold text-[#3F342B] hover:border-[#D9A441] transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#D9A441]" />
            <span>+ สร้างข้อแรกทันที</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === questions.length - 1;
            const isThisUploading = uploadingIndex === idx;

            return (
              <div
                key={q.id || idx}
                className="bg-[#FAF6F0]/60 rounded-3xl p-5 border border-[#EADBCC] shadow-xs space-y-4 hover:border-[#D9A441]/60 transition-all"
              >
                {/* Header: Question Number & Actions */}
                <div className="flex items-center justify-between gap-2 border-b border-[#EADBCC] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-[#D9A441] text-white font-black text-xs flex items-center justify-center shadow-2xs">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#3F342B]">
                      คำถามข้อที่ {idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Reorder Up/Down */}
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMove(idx, "up")}
                      className="p-1 rounded-lg text-[#7A6A5C] hover:text-[#3F342B] hover:bg-white disabled:opacity-30 transition-colors cursor-pointer"
                      title="เลื่อนขึ้น"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMove(idx, "down")}
                      className="p-1 rounded-lg text-[#7A6A5C] hover:text-[#3F342B] hover:bg-white disabled:opacity-30 transition-colors cursor-pointer"
                      title="เลื่อนลง"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-px h-3.5 bg-[#D9CABB] mx-1" />

                    {/* Required Checkbox */}
                    <label className="flex items-center gap-1 text-xs text-[#5A4D41] cursor-pointer mr-2">
                      <input
                        type="checkbox"
                        checked={q.isRequired}
                        onChange={(e) => handleUpdate(idx, { isRequired: e.target.checked })}
                        className="rounded border-[#D9CABB] text-[#D9A441] focus:ring-[#D9A441]"
                      />
                      <span className="font-semibold text-[11px]">จำเป็นต้องตอบ</span>
                    </label>

                    {/* Delete Question */}
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      className="p-1.5 rounded-lg text-[#B94E48] hover:bg-red-50 transition-colors cursor-pointer"
                      title="ลบคำถามข้อนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Textarea */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#5A4D41] flex items-center justify-between">
                    <span>
                      โจทย์ / ข้อความคำถาม <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[10px] text-[#A8988B]">
                      นักเรียนจะพิมพ์ตอบในกล่องข้อความ
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={q.questionText}
                    onChange={(e) => handleUpdate(idx, { questionText: e.target.value })}
                    placeholder="เช่น จากภาพประกอบด้านล่าง จงอธิบายหลักการทำงานของฟังก์ชันนี้..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9CABB] bg-white text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all"
                  />
                </div>

                {/* Hint Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#7A6A5C]">
                    คำอธิบายเพิ่มเติม / คำใบ้ (Hint) (ไม่บังคับ)
                  </label>
                  <input
                    type="text"
                    value={q.hint || ""}
                    onChange={(e) => handleUpdate(idx, { hint: e.target.value })}
                    placeholder="เช่น คำตอบควรมีความยาวอย่างน้อย 2 บรรทัด หรืออ้างอิงเอกสารบทที่ 3"
                    className="w-full px-3 py-1.5 rounded-xl border border-[#D9CABB] bg-white text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all"
                  />
                </div>

                {/* Per-Question Image Attachment Area */}
                <div className="space-y-2 pt-1 border-t border-[#EADBCC]/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#5A4D41] flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-[#D9A441]" />
                      <span>รูปภาพประกอบคำถามข้อนี้ (Question Image)</span>
                    </span>

                    {!q.imageUrl && (
                      <button
                        type="button"
                        disabled={isThisUploading}
                        onClick={() => triggerUploadImage(idx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#D9CABB] hover:border-[#D9A441] text-[11px] font-bold text-[#3F342B] hover:text-[#D9A441] transition-all cursor-pointer shadow-2xs"
                      >
                        {isThisUploading ? (
                          <Loader2 className="w-3 h-3 animate-spin text-[#D9A441]" />
                        ) : (
                          <ImageIcon className="w-3 h-3 text-[#D9A441]" />
                        )}
                        <span>{isThisUploading ? "กำลังอัปโหลด..." : "+ แนบรูปภาพข้อนี้"}</span>
                      </button>
                    )}
                  </div>

                  {/* Attached Image Card Preview */}
                  {q.imageUrl && (
                    <div className="relative rounded-2xl overflow-hidden border border-[#EADBCC] bg-white p-2 flex items-center justify-between gap-3 shadow-2xs group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#FAF6F0] border border-[#EADBCC] shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={q.imageUrl}
                            alt={`รูปภาพคำถามข้อที่ ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-[#3F342B] flex items-center gap-1.5">
                            <span>รูปภาพประกอบคำถามข้อที่ {idx + 1}</span>
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                              พร้อมแสดง
                            </span>
                          </p>
                          <a
                            href={q.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#D9A441] hover:underline inline-flex items-center gap-0.5 mt-0.5"
                          >
                            <span>คลิกเปิดดูรูปเต็ม</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => triggerUploadImage(idx)}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold text-[#7A6A5C] hover:bg-[#FAF6F0] border border-[#EADBCC] transition-colors cursor-pointer"
                        >
                          เปลี่ยนรูป
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdate(idx, { imageKey: undefined, imageUrl: undefined })}
                          className="p-1.5 rounded-lg text-[#B94E48] hover:bg-red-50 transition-colors cursor-pointer"
                          title="ลบรูปภาพข้อนี้"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
