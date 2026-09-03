"use client";

import { useState, useRef } from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  Link as LinkIcon,
  Eye,
  Edit3,
  Sparkles,
  Info,
} from "lucide-react";
import { MarkdownViewer } from "./MarkdownViewer";

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  required?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "พิมพ์รายละเอียดคำสั่งงาน...",
  rows = 8,
  label,
  required = false,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (prefix: string, suffix: string = "", defaultText: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || defaultText;

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 10);
  };

  const handleInsertHeading = (level: 1 | 2 | 3) => {
    const prefix = "#".repeat(level) + " ";
    insertText(prefix, "", `หัวข้อระดับ ${level}`);
  };

  const handleInsertTable = () => {
    const tableTemplate =
      "\n| หัวข้อ 1 | หัวข้อ 2 | รายละเอียด |\n| :--- | :--- | :--- |\n| ตัวอย่างข้อมูล 1 | ข้อมูล 2 | รายละเอียด... |\n";
    insertText(tableTemplate);
  };

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[#5A4D41]">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <span className="text-[11px] text-[#A8988B] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#D9A441]" />
            <span>รองรับการจัดรูปแบบ Markdown (Word-style)</span>
          </span>
        </div>
      )}

      <div className="bg-[#FAF6F0] rounded-2xl border border-[#D9CABB] overflow-hidden focus-within:ring-2 focus-within:ring-[#D9A441] focus-within:border-transparent transition-all">
        {/* Editor Toolbar */}
        <div className="p-2 bg-[#FAF0E1]/80 border-b border-[#EADBCC] flex flex-wrap items-center justify-between gap-1.5">
          {/* Formatting Controls */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => insertText("**", "**", "ข้อความตัวหนา")}
              className="p-1.5 rounded-lg bg-white/70 hover:bg-white text-[#5A4D41] hover:text-[#3F342B] border border-[#EADBCC] transition-colors cursor-pointer"
              title="ตัวหนา (Bold)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertText("*", "*", "ข้อความตัวเอียง")}
              className="p-1.5 rounded-lg bg-white/70 hover:bg-white text-[#5A4D41] hover:text-[#3F342B] border border-[#EADBCC] transition-colors cursor-pointer"
              title="ตัวเอียง (Italic)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-[#D9CABB] mx-0.5" />

            <button
              type="button"
              onClick={() => handleInsertHeading(1)}
              className="px-2 py-1 rounded-lg bg-white/70 hover:bg-white text-[#5A4D41] hover:text-[#3F342B] border border-[#EADBCC] text-xs font-bold transition-colors cursor-pointer flex items-center gap-0.5"
              title="หัวข้อใหญ่ H1 (Heading 1)"
            >
              <Heading1 className="w-3.5 h-3.5" />
              <span>ใหญ่</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsertHeading(2)}
              className="px-2 py-1 rounded-lg bg-white/70 hover:bg-white text-[#5A4D41] hover:text-[#3F342B] border border-[#EADBCC] text-xs font-bold transition-colors cursor-pointer flex items-center gap-0.5"
              title="หัวข้อย่อย H2 (Heading 2)"
            >
              <Heading2 className="w-3.5 h-3.5" />
              <span>กลาง</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsertHeading(3)}
              className="px-2 py-1 rounded-lg bg-white/70 hover:bg-white text-[#5A4D41] hover:text-[#3F342B] border border-[#EADBCC] text-xs font-bold transition-colors cursor-pointer flex items-center gap-0.5"
              title="หัวข้อย่อย H3 (Heading 3)"
            >
              <Heading3 className="w-3.5 h-3.5" />
              <span>เล็ก</span>
            </button>

            <div className="w-px h-4 bg-[#D9CABB] mx-0.5" />

            <button
              type="button"
              onClick={() => insertText("\n- ", "", "รายการข้อ")}
              className="p-1.5 rounded-lg bg-white/70 hover:bg-white text-[#5A4D41] hover:text-[#3F342B] border border-[#EADBCC] transition-colors cursor-pointer"
              title="รายการจุด (Bullet list)"
            >
              <List className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertText("\n1. ", "", "รายการลำดับเลข")}
              className="p-1.5 rounded-lg bg-white/70 hover:bg-white text-[#5A4D41] hover:text-[#3F342B] border border-[#EADBCC] transition-colors cursor-pointer"
              title="ลำดับตัวเลข (Numbered list)"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertText("\n> ", "", "ข้อความอ้างอิงหรือหมายเหตุสำคัญ")}
              className="p-1.5 rounded-lg bg-white/70 hover:bg-white text-[#5A4D41] hover:text-[#3F342B] border border-[#EADBCC] transition-colors cursor-pointer"
              title="กล่องอ้างอิง (Quote / Callout)"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleInsertTable}
              className="p-1.5 rounded-lg bg-white/70 hover:bg-white text-[#5A4D41] hover:text-[#3F342B] border border-[#EADBCC] transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="แทรกตารางข้อมูล (Table)"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ตาราง</span>
            </button>

            <button
              type="button"
              onClick={() => insertText("[", "](https://...)", "ข้อความลิงก์")}
              className="p-1.5 rounded-lg bg-white/70 hover:bg-white text-[#5A4D41] hover:text-[#3F342B] border border-[#EADBCC] transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="แทรกลิงก์ (Link)"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ลิงก์</span>
            </button>
          </div>

          {/* Mode Switcher: Edit vs Preview */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-[#D9CABB]">
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "edit"
                  ? "bg-[#D9A441] text-white shadow-2xs"
                  : "text-[#7A6A5C] hover:text-[#3F342B]"
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>แก้ไข</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "preview"
                  ? "bg-[#D9A441] text-white shadow-2xs"
                  : "text-[#7A6A5C] hover:text-[#3F342B]"
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>ตัวอย่าง</span>
            </button>
          </div>
        </div>

        {/* Edit or Preview Body */}
        {activeTab === "edit" ? (
          <textarea
            ref={textareaRef}
            rows={rows}
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-4 bg-transparent text-xs sm:text-sm text-[#3F342B] placeholder-[#B5A597] focus:outline-none leading-relaxed font-mono resize-y"
          />
        ) : (
          <div className="p-5 min-h-[180px] bg-white">
            {value.trim() ? (
              <MarkdownViewer content={value} />
            ) : (
              <div className="p-8 text-center text-xs text-[#A8988B] flex flex-col items-center justify-center gap-1.5">
                <Info className="w-5 h-5 text-[#D9CABB]" />
                <span>ยังไม่มีข้อความ (พิมพ์ข้อความในแท็บแก้ไขเพื่อดูตัวอย่าง)</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
