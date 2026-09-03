"use client";

import { CheckCircle2, BookOpen } from "lucide-react";

interface AssignmentStat {
  id: string;
  title: string;
  submittedCount: number;
  totalStudents: number;
  maxScore: number;
}

interface AssignmentCompletionBarChartProps {
  title: string;
  subtitle?: string;
  assignments: AssignmentStat[];
}

export function AssignmentCompletionBarChart({
  title,
  subtitle,
  assignments,
}: AssignmentCompletionBarChartProps) {
  if (!assignments || assignments.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-[#EADBCC] shadow-xs text-center text-[#7A6A5C] text-xs">
        ไม่มีข้อมูลการบ้านในขณะนี้
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-3">
        <div>
          <h3 className="font-bold text-[#3F342B] text-sm sm:text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#D9A441]" />
            {title}
          </h3>
          {subtitle && <p className="text-[11px] text-[#7A6A5C]">{subtitle}</p>}
        </div>
      </div>

      {/* Bars List */}
      <div className="space-y-3.5">
        {assignments.map((item) => {
          const rate =
            item.totalStudents > 0
              ? Math.min(100, Math.round((item.submittedCount / item.totalStudents) * 100))
              : 0;

          const getRateBadge = (pct: number) => {
            if (pct >= 80)
              return "bg-emerald-100 text-emerald-800 border-emerald-200";
            if (pct >= 50)
              return "bg-[#FAF0E1] text-[#8C5D23] border-[#EADBCC]";
            return "bg-amber-100 text-amber-800 border-amber-200";
          };

          const getBarColor = (pct: number) => {
            if (pct >= 80) return "bg-emerald-500";
            if (pct >= 50) return "bg-[#D9A441]";
            return "bg-[#C96B4B]";
          };

          return (
            <div key={item.id} className="space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-bold text-[#3F342B] truncate max-w-sm">
                  {item.title}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#7A6A5C]">
                    ส่งแล้ว <strong className="text-[#3F342B]">{item.submittedCount}</strong> / {item.totalStudents} คน
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getRateBadge(
                      rate
                    )}`}
                  >
                    {rate}%
                  </span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="w-full h-3 bg-[#FAF6F0] rounded-full overflow-hidden border border-[#EADBCC] p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 shadow-2xs ${getBarColor(
                    rate
                  )}`}
                  style={{ width: `${rate}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
