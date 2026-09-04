"use client";

import { useState } from "react";
import { Award, CheckCircle2, Clock, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";

interface StudentAssignmentScore {
  id: string;
  title: string;
  maxScore: number;
  earnedScore?: number | null;
  status: "GRADED" | "SUBMITTED" | "PENDING";
}

interface StudentProgressChartProps {
  title: string;
  subtitle?: string;
  scores: StudentAssignmentScore[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function StudentProgressChart({
  title,
  subtitle,
  scores,
  collapsible = false,
  defaultExpanded = false,
}: StudentProgressChartProps) {
  const [isExpanded, setIsExpanded] = useState(!collapsible || defaultExpanded);
  if (!scores || scores.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-[#EADBCC] shadow-xs text-center text-[#7A6A5C] text-xs">
        ยังไม่มีข้อมูลภาระงานที่เปิดรับส่ง
      </div>
    );
  }

  const gradedScores = scores.filter((s) => s.status === "GRADED" && s.earnedScore !== null && s.earnedScore !== undefined);
  const totalEarned = gradedScores.reduce((acc, s) => acc + (s.earnedScore || 0), 0);
  const totalMax = gradedScores.reduce((acc, s) => acc + s.maxScore, 0);
  const overallPercent = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-xs space-y-4">
      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
          isExpanded ? "border-b border-[#F2E8DC] pb-3" : ""
        } ${collapsible ? "cursor-pointer select-none" : ""}`}
        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          <div>
            <h3 className="font-bold text-[#3F342B] text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#D9A441]" />
              {title}
            </h3>
            {subtitle && <p className="text-[11px] text-[#7A6A5C]">{subtitle}</p>}
          </div>

          {collapsible && (
            <button
              type="button"
              className="sm:hidden p-1.5 rounded-lg hover:bg-[#FAF0E1] text-[#7A6A5C]"
              aria-label="Toggle Chart"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {totalMax > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FAF0E1] text-[#8C5D23] border border-[#EADBCC]">
              ผลสัมฤทธิ์รวม: {totalEarned}/{totalMax} ({overallPercent}%)
            </span>
          )}

          {collapsible && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-[#8C5D23] font-semibold hover:underline">
              {isExpanded ? (
                <>
                  <span>ย่อเก็บ</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>แสดงสถิติ</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4">
        {scores.map((item) => {
          const isGraded = item.status === "GRADED" && item.earnedScore !== null && item.earnedScore !== undefined;
          const isSubmitted = item.status === "SUBMITTED";
          const percent = isGraded ? Math.round(((item.earnedScore || 0) / item.maxScore) * 100) : 0;

          return (
            <div key={item.id} className="space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-bold text-[#3F342B] truncate max-w-sm">
                  {item.title}
                </span>

                <div className="flex items-center gap-2">
                  {isGraded ? (
                    <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {item.earnedScore} / {item.maxScore} คะแนน ({percent}%)
                    </span>
                  ) : isSubmitted ? (
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      รอตรวจ (เต็ม {item.maxScore})
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      ยังไม่ส่ง (เต็ม {item.maxScore})
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 bg-[#FAF6F0] rounded-full overflow-hidden border border-[#EADBCC] p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 shadow-2xs ${
                    isGraded
                      ? percent >= 80
                        ? "bg-emerald-500"
                        : percent >= 50
                        ? "bg-[#D9A441]"
                        : "bg-[#B94E48]"
                      : isSubmitted
                      ? "bg-blue-400 opacity-60"
                      : "bg-transparent"
                  }`}
                  style={{ width: `${isGraded ? percent : isSubmitted ? 100 : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
