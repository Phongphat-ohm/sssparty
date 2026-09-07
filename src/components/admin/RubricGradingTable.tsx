"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  Award,
  CheckCircle2,
  Save,
  Loader2,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Percent,
  Lock,
  RotateCcw,
} from "lucide-react";
import { saveGradeAction, returnSubmissionAction } from "@/actions/grade";

export interface RubricDefinition {
  id: string;
  name: string;
  description: string | null;
  maxScore: number;
}

interface ExistingRubricScore {
  rubricId: string;
  score: number;
  note: string | null;
}

interface ExistingGrade {
  score: number;
  feedback: string | null;
  rubricScores: ExistingRubricScore[];
}

interface RubricGradingTableProps {
  submissionId: string;
  assignmentMaxScore: number;
  rubrics: RubricDefinition[];
  initialGrade: ExistingGrade | null;
  studentName: string;
  studentCode: string;
  className: string;
  studentNumber: number;
  isLate: boolean;
  isDraft?: boolean;
  status?: string;
  returnReason?: string | null;
  returnedAt?: string | null;
}

export function RubricGradingTable({
  submissionId,
  assignmentMaxScore,
  rubrics,
  initialGrade,
  studentName,
  studentCode,
  className,
  studentNumber,
  isLate,
  isDraft = false,
  status,
  returnReason,
  returnedAt,
}: RubricGradingTableProps) {
  const router = useRouter();
  const [isReturning, setIsReturning] = useState(false);

  const isReturned = status === "RETURNED";
  const isGradingDisabled = isDraft || isReturned;

  // Initialize rubric scores state
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const r of rubrics) {
      const existing = initialGrade?.rubricScores.find((rs) => rs.rubricId === r.id);
      map[r.id] = existing ? existing.score : r.maxScore; // default to full or existing
    }
    return map;
  });

  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const r of rubrics) {
      const existing = initialGrade?.rubricScores.find((rs) => rs.rubricId === r.id);
      map[r.id] = existing?.note || "";
    }
    return map;
  });

  const [feedback, setFeedback] = useState(initialGrade?.feedback || "");
  const [isPending, setIsPending] = useState(false);

  // Real-time Sum Calculation
  const totalScore = rubrics.reduce((acc, r) => acc + (Number(scores[r.id]) || 0), 0);
  const percentage = assignmentMaxScore > 0 ? Math.round((totalScore / assignmentMaxScore) * 100) : 0;

  // Grade color indicator
  const getGradeColor = (pct: number) => {
    if (pct >= 80) return { bg: "bg-emerald-500", text: "text-emerald-700", badge: "ดีเยี่ยม (A)" };
    if (pct >= 70) return { bg: "bg-teal-500", text: "text-teal-700", badge: "ดีมาก (B+ / B)" };
    if (pct >= 60) return { bg: "bg-[#D9A441]", text: "text-[#8C5D23]", badge: "ปานกลาง (C)" };
    if (pct >= 50) return { bg: "bg-[#C96B4B]", text: "text-[#C96B4B]", badge: "ผ่านเกณฑ์ (D)" };
    return { bg: "bg-[#B94E48]", text: "text-[#B94E48]", badge: "ควรปรับปรุง (F)" };
  };

  const gradeInfo = getGradeColor(percentage);

  const handleScoreChange = (rubricId: string, val: number, max: number) => {
    if (isGradingDisabled) return;
    const cleanVal = Math.min(Math.max(0, val), max);
    setScores((prev) => ({ ...prev, [rubricId]: cleanVal }));
  };

  const handleQuickPill = (rubricId: string, ratio: number, max: number) => {
    if (isGradingDisabled) return;
    const calculated = Math.round(max * ratio * 10) / 10;
    setScores((prev) => ({ ...prev, [rubricId]: calculated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGradingDisabled) return;
    setIsPending(true);

    try {
      const rubricScoresPayload = rubrics.map((r) => ({
        rubricId: r.id,
        score: scores[r.id] ?? 0,
        note: notes[r.id] || undefined,
      }));

      const res = await saveGradeAction({
        submissionId,
        rubricScores: rubricScoresPayload,
        feedback,
      });

      if (!res.success) {
        Swal.fire({
          icon: "error",
          title: "ไม่สามารถบันทึกเกรดได้",
          text: res.message || "เกิดข้อผิดพลาดในการบันทึก",
          confirmButtonColor: "#B94E48",
          confirmButtonText: "ตกลง",
          background: "#FFF9F0",
          color: "#3F342B",
        });
        setIsPending(false);
        return;
      }

      await Swal.fire({
        icon: "success",
        title: "บันทึกผลการตรวจงานสำเร็จ!",
        html: `
          <div class="text-xs text-[#5A4D41] space-y-1 mt-2">
            <p>นักเรียน: <strong>${studentName}</strong> (${className} #${studentNumber})</p>
            <p class="text-lg font-bold text-emerald-800">${totalScore} / ${assignmentMaxScore} คะแนน (${percentage}%)</p>
          </div>
        `,
        confirmButtonColor: "#D9A441",
        confirmButtonText: "รับทราบ",
        background: "#FFF9F0",
        color: "#3F342B",
        customClass: {
          popup: "rounded-3xl border border-[#EADBCC]",
          confirmButton: "rounded-xl font-semibold px-6 py-2.5 text-white cursor-pointer shadow-xs",
        },
      });

      router.refresh();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง",
        confirmButtonColor: "#B94E48",
        confirmButtonText: "ปิด",
        background: "#FFF9F0",
        color: "#3F342B",
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleReturnSubmission = async () => {
    if (isDraft) return;

    const { value: reason } = await Swal.fire({
      title: "ตีกลับงานให้แก้ไข",
      text: `ระบุเหตุผลในการตีกลับงานของ ${studentName} เพื่อให้นักเรียนทราบและแก้ไขส่งใหม่`,
      input: "textarea",
      inputPlaceholder: "เช่น ไฟล์เปิดไม่ได้, ยังไม่ได้เปิดสิทธิ์ Public, ขาดข้อมูลตามโจทย์...",
      showCancelButton: true,
      confirmButtonText: "ยืนยันตีกลับงาน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#C96B4B",
      cancelButtonColor: "#A8988B",
      background: "#FFF9F0",
      color: "#3F342B",
      customClass: {
        popup: "rounded-3xl border border-[#EADBCC]",
        confirmButton: "rounded-xl font-semibold px-5 py-2.5 text-white cursor-pointer shadow-xs",
        cancelButton: "rounded-xl font-semibold px-5 py-2.5 text-white cursor-pointer shadow-xs",
      },
      inputValidator: (val) => {
        if (!val || val.trim().length < 3) {
          return "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร";
        }
        return null;
      },
    });

    if (reason) {
      try {
        setIsReturning(true);
        const res = await returnSubmissionAction(submissionId, reason);
        if (res.success) {
          await Swal.fire({
            icon: "success",
            title: "ตีกลับงานสำเร็จ!",
            text: res.message,
            confirmButtonColor: "#D9A441",
            confirmButtonText: "รับทราบ",
            background: "#FFF9F0",
            color: "#3F342B",
            customClass: {
              popup: "rounded-3xl border border-[#EADBCC]",
              confirmButton: "rounded-xl font-semibold px-6 py-2.5 text-white cursor-pointer shadow-xs",
            },
          });
          router.refresh();
        } else {
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: res.message,
            confirmButtonColor: "#B94E48",
            confirmButtonText: "ปิด",
            background: "#FFF9F0",
            color: "#3F342B",
          });
        }
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: err.message || "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง",
          confirmButtonColor: "#B94E48",
          confirmButtonText: "ปิด",
          background: "#FFF9F0",
          color: "#3F342B",
        });
      } finally {
        setIsReturning(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs flex flex-col h-full overflow-hidden">
      {/* Top Header: Student Info & Overall Real-time Score */}
      <div className="p-5 bg-[#FAF6F0] border-b border-[#EADBCC] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#3F342B] text-base">{studentName}</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-[#D9CABB] text-[#7A6A5C]">
                {className} เลขที่ {studentNumber}
              </span>
              {isLate && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                  ส่งล่าช้า
                </span>
              )}
              {status === "RETURNED" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  <span>ถูกตีกลับ</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#7A6A5C]">รหัสนักเรียน: {studentCode}</p>
          </div>

          {/* Big Real-Time Score Badge */}
          <div className="text-right">
            <div className="inline-flex items-baseline gap-1 bg-white px-3.5 py-1.5 rounded-2xl border border-[#EADBCC] shadow-2xs">
              <span className="text-2xl font-extrabold text-[#B94E48]">{totalScore}</span>
              <span className="text-xs font-bold text-[#7A6A5C]">/ {assignmentMaxScore}</span>
              <span className="text-xs font-bold text-emerald-700 ml-1">({percentage}%)</span>
            </div>
            <p className="text-[10px] font-semibold text-[#8C5D23] mt-0.5">{gradeInfo.badge}</p>
          </div>
        </div>

        {/* Real-time Visual Progress Bar */}
        <div className="space-y-1">
          <div className="w-full h-2.5 bg-[#EADBCC] rounded-full overflow-hidden">
            <div
              className={`h-full ${gradeInfo.bg} rounded-full transition-all duration-300`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grading Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between p-5 space-y-5 overflow-auto">
        {/* Draft Notice Banner */}
        {isDraft && (
          <div className="p-4 bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl text-xs font-semibold flex items-start gap-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block text-amber-950">
                ⚠️ ชิ้นงานนี้อยู่ในสถานะแบบร่าง (Draft)
              </span>
              <span className="text-amber-900 font-normal leading-relaxed block">
                นักเรียนยังไม่ได้กดยืนยันส่งงานอย่างเป็นทางการ คุณครูสามารถดูความคืบหน้าของงานได้ แต่ระบบจะล็อกการให้คะแนนไว้จนกว่านักเรียนจะกดยืนยันส่งงาน
              </span>
            </div>
          </div>
        )}

        {/* Returned Notice Banner */}
        {isReturned && (
          <div className="p-4 bg-orange-50 border border-orange-300 text-orange-950 rounded-2xl text-xs font-semibold flex items-start gap-2.5 shadow-2xs">
            <RotateCcw className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-orange-950 text-sm">
                ⚠️ งานนี้อยู่ในสถานะ &ldquo;ถูกตีกลับให้แก้ไข&rdquo; (ล็อกการให้คะแนน)
              </span>
              <p className="text-orange-900 font-normal leading-relaxed">
                คุณครูได้ตีกลับงานชิ้นนี้เพื่อให้นักเรียนส่งงานฉบับปรับปรุงใหม่ ระบบจึงไม่อนุญาตให้กรอกหรือบันทึกคะแนนจนกว่านักเรียนจะทำการแก้ไขและส่งงานใหม่อีกครั้ง
              </p>
              {returnReason && (
                <div className="bg-white/90 p-2.5 rounded-xl border border-orange-200 mt-1">
                  <span className="font-bold text-orange-950">เหตุผลและคำแนะนำที่คุณครูระบุไว้: </span>
                  <span className="text-orange-900 font-normal">&ldquo;{returnReason}&rdquo;</span>
                </div>
              )}
              {returnedAt && (
                <span className="text-[10px] text-orange-700/80 font-mono block mt-0.5">
                  วันเวลาที่ตีกลับ: {new Date(returnedAt).toLocaleString("th-TH")}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Resubmission Context Banner for Teacher (When status is SUBMITTED/LATE/GRADED but was previously returned) */}
        {!isReturned && returnReason && (
          <div className="p-4 bg-indigo-50/80 border border-indigo-200 text-indigo-950 rounded-2xl text-xs font-semibold flex items-start gap-2.5 shadow-2xs">
            <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1 w-full">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-bold text-indigo-950 text-xs sm:text-sm">
                  📌 ชิ้นงานฉบับแก้ไขส่งใหม่ (นักเรียนส่งงานรอบใหม่แล้ว)
                </span>
                {returnedAt && (
                  <span className="text-[10px] text-indigo-700/80 font-mono">
                    ตีกลับเมื่อ: {new Date(returnedAt).toLocaleString("th-TH")}
                  </span>
                )}
              </div>
              <p className="text-indigo-900 font-normal leading-relaxed text-[11px]">
                งานนี้เคยถูกตีกลับเพื่อให้นักเรียนแก้ไข คุณครูสามารถตรวจเปรียบเทียบผลงานฉบับใหม่กับคำแนะนำเดิมด้านล่างนี้ได้:
              </p>
              <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-200 mt-1 text-xs">
                <span className="font-bold text-indigo-950">เหตุผลและคำแนะนำที่คุณครูเคยระบุไว้: </span>
                <span className="text-indigo-900 font-normal">&ldquo;{returnReason}&rdquo;</span>
              </div>
            </div>
          </div>
        )}

        {/* Rubrics Grading Table */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A4D41] flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#D9A441]" />
            เกณฑ์การประเมิน (Rubrics) และการให้คะแนน
          </h4>

          <div className="space-y-3">
            {rubrics.map((rubric, idx) => {
              const currentScore = scores[rubric.id] ?? 0;

              return (
                <div
                  key={rubric.id}
                  className="bg-[#FAF6F0] rounded-2xl p-4 border border-[#EADBCC] space-y-3 shadow-2xs hover:border-[#D9A441]/50 transition-colors"
                >
                  {/* Row 1: Rubric Title & Description */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#3F342B]">
                        {idx + 1}. {rubric.name}
                      </span>
                      <span className="text-[11px] font-bold text-[#B94E48] bg-white px-2 py-0.5 rounded-md border border-[#EADBCC]">
                        เต็ม {rubric.maxScore} คะแนน
                      </span>
                    </div>
                    {rubric.description && (
                      <p className="text-[11px] text-[#7A6A5C] mt-1 leading-relaxed">
                        {rubric.description}
                      </p>
                    )}
                  </div>

                  {/* Row 2: Quick Score Pills & Custom Input */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#EADBCC]/60">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#A8988B] mr-1">ให้คะแนนด่วน:</span>
                      {[
                        { label: "0%", ratio: 0 },
                        { label: "50%", ratio: 0.5 },
                        { label: "75%", ratio: 0.75 },
                        { label: "100%", ratio: 1 },
                      ].map((pill) => (
                        <button
                          key={pill.label}
                          type="button"
                          disabled={isGradingDisabled}
                          onClick={() => handleQuickPill(rubric.id, pill.ratio, rubric.maxScore)}
                          className="px-2 py-1 text-[10px] font-bold rounded-lg bg-white hover:bg-[#FAF0E1] text-[#5A4D41] hover:text-[#8C5D23] border border-[#D9CABB] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] font-semibold text-[#5A4D41]">คะแนน:</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={rubric.maxScore}
                        disabled={isGradingDisabled}
                        value={currentScore}
                        onChange={(e) =>
                          handleScoreChange(rubric.id, parseFloat(e.target.value) || 0, rubric.maxScore)
                        }
                        className="w-16 px-2.5 py-1.5 text-center text-xs font-extrabold rounded-xl border border-[#D9CABB] bg-white text-[#B94E48] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-xs text-[#7A6A5C]">/ {rubric.maxScore}</span>
                    </div>
                  </div>

                  {/* Row 3: Note per rubric */}
                  <div>
                    <input
                      type="text"
                      disabled={isGradingDisabled}
                      placeholder="ข้อเสนอแนะเฉพาะเกณฑ์นี้ (ถ้ามี)..."
                      value={notes[rubric.id] || ""}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [rubric.id]: e.target.value }))
                      }
                      className="w-full px-3 py-1.5 text-[11px] rounded-xl border border-[#D9CABB] bg-white text-[#3F342B] placeholder-[#B5A597] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-50"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overall Feedback */}
        <div className="space-y-1.5 pt-2 border-t border-[#F2E8DC]">
          <label className="text-xs font-bold text-[#5A4D41] flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#D9A441]" />
            คำติชมและข้อเสนอแนะรวมถึงนักเรียน (Overall Feedback)
          </label>
          <textarea
            rows={3}
            disabled={isGradingDisabled}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="เขียนคำชม ข้อสังเกต หรือแนวทางพัฒนาผลงานในครั้งต่อไปให้นักเรียน..."
            className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-2xl border border-[#D9CABB] bg-[#FAF6F0] text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] leading-relaxed disabled:opacity-50"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {/* Submit Grading Button */}
          <button
            type="submit"
            disabled={isPending || isGradingDisabled || isReturning}
            className={`flex-1 py-3.5 px-4 rounded-2xl text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 ${
              isReturned
                ? "bg-orange-900/60 cursor-not-allowed opacity-75"
                : isDraft
                ? "bg-amber-800/60 cursor-not-allowed opacity-75"
                : "bg-[#B94E48] hover:bg-[#A33F39] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            }`}
          >
            {isReturned ? (
              <>
                <Lock className="w-4 h-4" />
                <span>ไม่สามารถให้คะแนนได้ (งานถูกตีกลับให้นักเรียนแก้ไข)</span>
              </>
            ) : isDraft ? (
              <>
                <Lock className="w-4 h-4" />
                <span>ล็อกการให้คะแนน (งานแบบร่าง)</span>
              </>
            ) : isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>กำลังบันทึกผลการตรวจงาน...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกคะแนนและคำติชม ({totalScore} / {assignmentMaxScore})</span>
              </>
            )}
          </button>

          {/* Return Submission Button */}
          {!isDraft && (
            <button
              type="button"
              onClick={handleReturnSubmission}
              disabled={isPending || isReturning}
              className="py-3.5 px-4 rounded-2xl text-xs font-bold text-[#8C4623] bg-orange-50 border border-orange-200 hover:bg-orange-100 active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0"
              title="ตีกลับงานให้นักเรียนแก้ไขส่งใหม่ พร้อมระบุเหตุผล"
            >
              <RotateCcw className={`w-4 h-4 text-[#8C4623] ${isReturning ? "animate-spin" : ""}`} />
              <span>
                {isReturning
                  ? "กำลังตีกลับ..."
                  : isReturned
                  ? "แก้ไขเหตุผลที่ตีกลับ"
                  : "ตีกลับให้แก้ไข"}
              </span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
