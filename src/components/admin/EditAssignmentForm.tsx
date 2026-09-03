"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  Lock,
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
import { updateAssignmentAction } from "@/actions/assignment";

interface EditAssignmentFormProps {
  assignment: {
    id: string;
    title: string;
    description: string;
    maxScore: number;
    dueDate: Date;
    status: "DRAFT" | "PUBLISHED" | "CLOSED";
    submissionType: "FILE" | "LINK" | "QUESTIONS";
    rubrics: RubricItem[];
    attachments: TeacherAttachmentItem[];
    questions: AssignmentQuestionItem[];
    submissionsCount: number;
  };
}

export function EditAssignmentForm({ assignment }: EditAssignmentFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description);
  const [maxScore, setMaxScore] = useState(assignment.maxScore);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "CLOSED">(assignment.status);
  const [submissionType, setSubmissionType] = useState<"FILE" | "LINK" | "QUESTIONS">(
    assignment.submissionType || "FILE"
  );

  // Formatted date for datetime-local
  const initialDueDate = new Date(assignment.dueDate).toISOString().slice(0, 16);
  const [dueDate, setDueDate] = useState(initialDueDate);

  const [rubrics, setRubrics] = useState<RubricItem[]>(assignment.rubrics);
  const [attachments, setAttachments] = useState<TeacherAttachmentItem[]>(
    assignment.attachments || []
  );
  const [questions, setQuestions] = useState<AssignmentQuestionItem[]>(
    assignment.questions || []
  );

  const isLocked = assignment.submissionsCount > 0;
  const rubricSum = rubrics.reduce((acc, r) => acc + (Number(r.maxScore) || 0), 0);
  const isMatch = isLocked || (Math.abs(rubricSum - maxScore) < 0.001 && maxScore > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isLocked && !isMatch) {
      setErrorMessage(
        `ไม่สามารถบันทึกได้: ผลรวมคะแนน Rubric (${rubricSum}) ไม่ตรงกับคะแนนเต็ม (${maxScore})`
      );
      return;
    }

    if (!isLocked && submissionType === "QUESTIONS" && questions.length === 0) {
      setErrorMessage("เมื่อเลือกส่งงานแบบตอบคำถาม ต้องสร้างคำถามอย่างน้อย 1 ข้อ");
      return;
    }

    setIsPending(true);

    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("description", description);
      formData.set("dueDate", dueDate);
      formData.set("status", status);
      formData.set("attachmentsJson", JSON.stringify(attachments));

      if (!isLocked) {
        formData.set("maxScore", maxScore.toString());
        formData.set("submissionType", submissionType);
        formData.set("rubricsJson", JSON.stringify(rubrics));
        formData.set("questionsJson", JSON.stringify(questions));
      }

      const result = await updateAssignmentAction(assignment.id, formData);

      if (!result.success) {
        setErrorMessage(result.message || "เกิดข้อผิดพลาดในการอัปเดต");
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
    <div className="space-y-6">
      {/* Back Button and Title */}
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
            แก้ไขการบ้าน (Edit Assignment)
          </h1>
          <p className="text-xs text-[#7A6A5C]">
            แก้ไขรายละเอียด คำสั่งงาน ไฟล์แนบโจทย์ และเกณฑ์การประเมิน
          </p>
        </div>
      </div>

      {isLocked && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-[#8C5D23] rounded-2xl text-xs font-medium flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-[#D9A441] shrink-0" />
          <span>
            มีการส่งงานแล้ว <strong>{assignment.submissionsCount} ชิ้น</strong> —
            ระบบล็อกเกณฑ์ Rubric คะแนนเต็ม และรูปแบบการส่งงาน เพื่อความถูกต้องยุติธรรมของคะแนนเดิม (อนุญาตให้แก้ไขชื่อ คำสั่งงาน กำหนดส่ง สถานะ และไฟล์แนบโจทย์ได้)
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-[#B94E48] rounded-2xl text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Basic Information */}
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#5A4D41]">
                  คะแนนเต็มรวม (Max Score) <span className="text-red-500">*</span>
                </label>
                {isLocked && <Lock className="w-3 h-3 text-[#A8988B]" />}
              </div>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                disabled={isLocked}
                value={maxScore || ""}
                onChange={(e) => setMaxScore(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-sm font-bold text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41]">สถานะงาน</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "DRAFT" | "PUBLISHED" | "CLOSED")}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all font-medium"
              >
                <option value="DRAFT">ฉบับร่าง (DRAFT)</option>
                <option value="PUBLISHED">เปิดรับงาน (PUBLISHED)</option>
                <option value="CLOSED">ปิดรับงานแล้ว (CLOSED)</option>
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
                {isLocked
                  ? "รูปแบบการส่งงานถูกล็อกเนื่องจากมีนักเรียนส่งงานแล้ว"
                  : "กำหนดว่านักเรียนจะต้องส่งงานในรูปแบบใดสำหรับการบ้านชิ้นนี้"}
              </p>
            </div>
            {isLocked && <Lock className="w-4 h-4 text-[#A8988B]" />}
          </div>

          {/* 3 Radio Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Option 1: File Upload */}
            <div
              onClick={() => !isLocked && setSubmissionType("FILE")}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-2 ${
                isLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer"
              } ${
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
                  disabled={isLocked}
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
              onClick={() => !isLocked && setSubmissionType("LINK")}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-2 ${
                isLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer"
              } ${
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
                  disabled={isLocked}
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
              onClick={() => !isLocked && setSubmissionType("QUESTIONS")}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-2 ${
                isLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer"
              } ${
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
                  disabled={isLocked}
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
                onChange={isLocked ? () => {} : setQuestions}
              />
            </div>
          )}
        </div>

        {/* Card 3: Dynamic Rubric Builder */}
        <div className="bg-white rounded-3xl p-6 border border-[#EADBCC] shadow-xs">
          <RubricBuilder
            rubrics={rubrics}
            onChange={isLocked ? () => {} : setRubrics}
            assignmentMaxScore={maxScore}
            isLocked={isLocked}
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
            disabled={isPending || (!isLocked && !isMatch)}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs font-bold text-white bg-[#B94E48] hover:bg-[#A33F39] active:scale-[0.99] disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>กำลังบันทึกการเปลี่ยนแปลง...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการแก้ไขการบ้าน</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
