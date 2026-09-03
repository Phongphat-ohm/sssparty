"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  UploadCloud,
  Link2,
  HelpCircle,
} from "lucide-react";
import { RubricBuilder, RubricItem } from "@/components/admin/RubricBuilder";
import { MarkdownEditor } from "@/components/ui/MarkdownEditor";
import {
  TeacherAttachmentUploader,
  TeacherAttachmentItem,
} from "@/components/admin/TeacherAttachmentUploader";
import {
  QuestionBuilder,
  AssignmentQuestionItem,
} from "@/components/admin/QuestionBuilder";
import { createAssignmentAction } from "@/actions/assignment";

const DEFAULT_RUBRICS: RubricItem[] = [
  {
    name: "ความคิดสร้างสรรค์และการสื่อความหมาย",
    description: "แนวคิดการออกแบบแปลกใหม่ น่าสนใจ และสื่อถึงเอกลักษณ์ของชุมนุมได้อย่างตรงจุด",
    maxScore: 10,
    sortOrder: 1,
  },
  {
    name: "ความถูกต้องและสมบูรณ์ของชิ้นงาน",
    description: "ความถูกต้องตามโจทย์ที่ได้รับมอบหมาย และคุณภาพความประณีตของไฟล์",
    maxScore: 10,
    sortOrder: 2,
  },
];

export default function NewAssignmentPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(
    "## 📌 คำสั่งและเป้าหมายของงาน\nให้นักเรียนปฏิบัติตามขั้นตอนต่อไปนี้:\n- ขั้นที่ 1: ...\n- ขั้นที่ 2: ...\n\n> 💡 **หมายเหตุ:** ตรวจสอบความถูกต้องก่อนส่งงาน"
  );
  const [maxScore, setMaxScore] = useState(20);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("PUBLISHED");
  const [submissionType, setSubmissionType] = useState<"FILE" | "LINK" | "QUESTIONS">("FILE");

  // Default due date: 7 days from now formatted for datetime-local
  const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
  const [dueDate, setDueDate] = useState(defaultDueDate);

  const [rubrics, setRubrics] = useState<RubricItem[]>(DEFAULT_RUBRICS);
  const [attachments, setAttachments] = useState<TeacherAttachmentItem[]>([]);
  const [questions, setQuestions] = useState<AssignmentQuestionItem[]>([]);

  // Sync rubrics sum
  const rubricSum = rubrics.reduce((acc, r) => acc + (Number(r.maxScore) || 0), 0);
  const isMatch = Math.abs(rubricSum - maxScore) < 0.001 && maxScore > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isMatch) {
      setErrorMessage(
        `ไม่สามารถบันทึกได้: ผลรวมคะแนน Rubric (${rubricSum}) ไม่ตรงกับคะแนนเต็มของงาน (${maxScore})`
      );
      return;
    }

    if (rubrics.length === 0) {
      setErrorMessage("ต้องมีเกณฑ์ Rubric อย่างน้อย 1 ข้อ");
      return;
    }

    if (submissionType === "QUESTIONS" && questions.length === 0) {
      setErrorMessage("เมื่อเลือกส่งงานแบบตอบคำถาม ต้องสร้างคำถามอย่างน้อย 1 ข้อ");
      return;
    }

    setIsPending(true);

    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("description", description);
      formData.set("maxScore", maxScore.toString());
      formData.set("dueDate", dueDate);
      formData.set("status", status);
      formData.set("submissionType", submissionType);
      formData.set("rubricsJson", JSON.stringify(rubrics));
      formData.set("attachmentsJson", JSON.stringify(attachments));
      formData.set("questionsJson", JSON.stringify(questions));

      const result = await createAssignmentAction(formData);

      if (!result.success) {
        setErrorMessage(result.message || "เกิดข้อผิดพลาดในการบันทึก");
        setIsPending(false);
        return;
      }

      router.push("/admin/assignments");
      router.refresh();
    } catch (err) {
      console.error(err);
      setErrorMessage("เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง");
      setIsPending(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-4xl w-full mx-auto">
      {/* Top Header & Back Button */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/assignments"
          className="p-2 rounded-xl bg-white border border-[#EADBCC] text-[#7A6A5C] hover:text-[#3F342B] transition-colors"
          title="ย้อนกลับ"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#3F342B] tracking-tight">
            สร้างการบ้านใหม่ (New Assignment)
          </h1>
          <p className="text-xs text-[#7A6A5C]">
            กำหนดรายละเอียดงาน รูปแบบการส่ง แนบไฟล์โจทย์ และเกณฑ์การให้คะแนน Rubric
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-[#B94E48] rounded-2xl text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Basic Information & Markdown Editor */}
        <div className="bg-white rounded-3xl p-6 border border-[#EADBCC] shadow-xs space-y-5">
          <h2 className="font-bold text-[#3F342B] text-base flex items-center gap-2 border-b border-[#F2E8DC] pb-3">
            <FileText className="w-4 h-4 text-[#D9A441]" />
            ข้อมูลพื้นฐานของการบ้าน
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5A4D41]">
              ชื่อการบ้าน / ชิ้นงาน <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ออกแบบแบนเนอร์ประชาสัมพันธ์ชุมนุมสื่อสร้างสรรค์"
              className="w-full px-4 py-3 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all"
            />
          </div>

          {/* Markdown Editor for Description */}
          <MarkdownEditor
            label="คำสั่งและรายละเอียดภาระงาน (รองรับ Markdown ตัวใหญ่/ตัวเล็ก ตาราง ลิสต์)"
            required
            value={description}
            onChange={setDescription}
            placeholder="อธิบายรายละเอียด สิ่งที่นักเรียนต้องทำ รูปแบบไฟล์ที่ต้องการ และเป้าหมายของงาน..."
            rows={7}
          />

          {/* Teacher Attachments Uploader */}
          <div className="pt-2 border-t border-[#F2E8DC]">
            <TeacherAttachmentUploader
              attachments={attachments}
              onChange={setAttachments}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#F2E8DC]">
            {/* Max Score */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41]">
                คะแนนเต็มรวม (Max Score) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={maxScore || ""}
                onChange={(e) => setMaxScore(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-sm font-bold text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all"
              />
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41]">
                กำหนดส่งงาน (Due Date) <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all"
              />
            </div>

            {/* Initial Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41]">
                สถานะการเริ่มต้น
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "DRAFT" | "PUBLISHED")}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all font-medium"
              >
                <option value="PUBLISHED">เปิดรับส่งงานทันที (PUBLISHED)</option>
                <option value="DRAFT">บันทึกเป็นฉบับร่างไว้ก่อน (DRAFT)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 2: Submission Type Selector */}
        <div className="bg-white rounded-3xl p-6 border border-[#EADBCC] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-3">
            <div>
              <h2 className="font-bold text-[#3F342B] text-base flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-[#D9A441]" />
                รูปแบบการส่งงานของนักเรียน (Submission Type)
              </h2>
              <p className="text-xs text-[#7A6A5C] mt-0.5">
                กำหนดว่านักเรียนจะต้องส่งงานในรูปแบบใดสำหรับการบ้านชิ้นนี้
              </p>
            </div>
          </div>

          {/* 3 Radio Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Option 1: File Upload */}
            <div
              onClick={() => setSubmissionType("FILE")}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                submissionType === "FILE"
                  ? "border-[#D9A441] bg-[#FFF9F0] shadow-xs"
                  : "border-[#EADBCC] bg-[#FAF6F0]/40 hover:bg-[#FAF6F0]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-2xs">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <input
                  type="radio"
                  name="submissionType"
                  value="FILE"
                  checked={submissionType === "FILE"}
                  onChange={() => setSubmissionType("FILE")}
                  className="text-[#D9A441] focus:ring-[#D9A441]"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-[#3F342B]">📁 ส่งแบบไฟล์ (File)</p>
                <p className="text-xs text-[#7A6A5C] mt-0.5">
                  อัปโหลดไฟล์งาน เช่น รูปภาพ, PDF, Word, Excel, PPT, วิดีโอ หรือ ZIP
                </p>
              </div>
            </div>

            {/* Option 2: Link */}
            <div
              onClick={() => setSubmissionType("LINK")}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                submissionType === "LINK"
                  ? "border-[#D9A441] bg-[#FFF9F0] shadow-xs"
                  : "border-[#EADBCC] bg-[#FAF6F0]/40 hover:bg-[#FAF6F0]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-2xs">
                  <Link2 className="w-5 h-5" />
                </div>
                <input
                  type="radio"
                  name="submissionType"
                  value="LINK"
                  checked={submissionType === "LINK"}
                  onChange={() => setSubmissionType("LINK")}
                  className="text-[#D9A441] focus:ring-[#D9A441]"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-[#3F342B]">🔗 ส่งแบบลิงก์ (URL)</p>
                <p className="text-xs text-[#7A6A5C] mt-0.5">
                  ส่ง URL ผลงานภายนอก เช่น Google Drive, Canva, Figma, GitHub, YouTube
                </p>
              </div>
            </div>

            {/* Option 3: Questions */}
            <div
              onClick={() => setSubmissionType("QUESTIONS")}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                submissionType === "QUESTIONS"
                  ? "border-[#D9A441] bg-[#FFF9F0] shadow-xs"
                  : "border-[#EADBCC] bg-[#FAF6F0]/40 hover:bg-[#FAF6F0]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-2xs">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <input
                  type="radio"
                  name="submissionType"
                  value="QUESTIONS"
                  checked={submissionType === "QUESTIONS"}
                  onChange={() => setSubmissionType("QUESTIONS")}
                  className="text-[#D9A441] focus:ring-[#D9A441]"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-[#3F342B]">📝 ตอบคำถาม (Questions)</p>
                <p className="text-xs text-[#7A6A5C] mt-0.5">
                  สร้างชุดข้อคำถามให้นักเรียนพิมพ์ตอบ พร้อมแนบรูปภาพในแต่ละข้อได้
                </p>
              </div>
            </div>
          </div>

          {/* Conditional Question Builder */}
          {submissionType === "QUESTIONS" && (
            <div className="pt-4 border-t border-[#F2E8DC]">
              <QuestionBuilder
                questions={questions}
                onChange={setQuestions}
              />
            </div>
          )}
        </div>

        {/* Card 3: Dynamic Rubric Builder */}
        <div className="bg-white rounded-3xl p-6 border border-[#EADBCC] shadow-xs">
          <RubricBuilder
            rubrics={rubrics}
            onChange={setRubrics}
            assignmentMaxScore={maxScore}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/assignments"
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[#D9CABB] text-xs font-semibold text-[#7A6A5C] hover:bg-[#FAF6F0] text-center transition-all"
          >
            ยกเลิก
          </Link>

          <button
            type="submit"
            disabled={isPending || !isMatch}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs font-bold text-white bg-[#B94E48] hover:bg-[#A33F39] active:scale-[0.99] disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการบ้านและเกณฑ์ Rubric</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
