"use client";

import { Award } from "lucide-react";

interface GradeBucket {
  label: string;
  range: string;
  count: number;
  color: string;
  badgeBg: string;
}

interface ScoreDistributionChartProps {
  title: string;
  subtitle?: string;
  buckets: GradeBucket[];
}

export function ScoreDistributionChart({
  title,
  subtitle,
  buckets,
}: ScoreDistributionChartProps) {
  const totalGraded = buckets.reduce((acc, b) => acc + b.count, 0);

  // Calculate SVG Donut segments
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-xs space-y-4">
      {/* Header */}
      <div className="border-b border-[#F2E8DC] pb-3">
        <h3 className="font-bold text-[#3F342B] text-sm sm:text-base flex items-center gap-2">
          <Award className="w-4 h-4 text-[#B94E48]" />
          {title}
        </h3>
        {subtitle && <p className="text-[11px] text-[#7A6A5C]">{subtitle}</p>}
      </div>

      {totalGraded === 0 ? (
        <div className="p-8 text-center text-[#7A6A5C] text-xs">
          ยังไม่มีข้อมูลคะแนนที่ตรวจแล้วในขณะนี้
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
          {/* SVG Donut Chart */}
          <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="-rotate-90 transform"
            >
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#FAF0E1"
                strokeWidth={strokeWidth}
              />

              {/* Data segments */}
              {buckets.map((b) => {
                if (b.count === 0) return null;
                const percent = (b.count / totalGraded) * 100;
                const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((cumulativePercent / 100) * circumference);
                cumulativePercent += percent;

                return (
                  <circle
                    key={b.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={b.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>

            {/* Inner Center Label */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-[#3F342B]">
                {totalGraded}
              </span>
              <span className="text-[10px] text-[#7A6A5C] font-semibold -mt-1">
                ตรวจแล้ว
              </span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 w-full sm:w-auto">
            {buckets.map((b) => {
              const pct =
                totalGraded > 0 ? Math.round((b.count / totalGraded) * 100) : 0;

              return (
                <div
                  key={b.label}
                  className="flex items-center justify-between gap-3 p-2 rounded-xl bg-[#FAF6F0] border border-[#EADBCC]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    <div>
                      <p className="text-xs font-bold text-[#3F342B] leading-tight">
                        {b.label}
                      </p>
                      <p className="text-[10px] text-[#7A6A5C]">{b.range}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-[#3F342B]">
                      {b.count} คน
                    </span>
                    <span className="block text-[10px] text-[#7A6A5C] font-semibold">
                      ({pct}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
