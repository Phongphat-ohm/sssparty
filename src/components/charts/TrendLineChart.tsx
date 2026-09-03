"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";

interface DataPoint {
  label: string; // e.g. "28 ส.ค.", "29 ส.ค."
  value: number; // count
}

interface TrendLineChartProps {
  title: string;
  subtitle?: string;
  data: DataPoint[];
  lineColor?: string;
  unit?: string;
}

export function TrendLineChart({
  title,
  subtitle,
  data,
  lineColor = "#D9A441",
  unit = "ชิ้น",
}: TrendLineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-[#EADBCC] shadow-xs text-center text-[#7A6A5C] text-xs">
        ไม่มีข้อมูลแนวโน้มในขณะนี้
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 5); // ensure at least 5 for scale
  const minValue = 0;

  // SVG dimensions
  const width = 500;
  const height = 200;
  const paddingX = 35;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate coordinates
  const points = data.map((d, index) => {
    const x =
      data.length === 1
        ? width / 2
        : paddingX + (index / (data.length - 1)) * chartWidth;
    const y =
      paddingTop +
      chartHeight -
      ((d.value - minValue) / (maxValue - minValue)) * chartHeight;
    return { x, y, ...d };
  });

  // Generate smooth SVG Path
  const generateSmoothPath = (pts: typeof points) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i != pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const linePath = generateSmoothPath(points);
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${
          points[0].x
        } ${height - paddingBottom} Z`
      : "";

  const totalSum = values.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F2E8DC] pb-3">
        <div>
          <h3 className="font-bold text-[#3F342B] text-sm sm:text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#B94E48]" />
            {title}
          </h3>
          {subtitle && <p className="text-[11px] text-[#7A6A5C]">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FAF0E1] text-[#8C5D23] border border-[#EADBCC]">
            รวมทั้งหมด: <strong className="text-[#3F342B]">{totalSum}</strong> {unit}
          </span>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 sm:h-52 overflow-visible select-none"
        >
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + chartHeight * (1 - ratio);
            const val = Math.round(minValue + ratio * (maxValue - minValue));
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#F2E8DC"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#A8988B"
                  fontWeight="600"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {areaPath && (
            <path d={areaPath} fill="url(#trendGradient)" />
          )}

          {/* Smooth Line */}
          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, idx) => {
            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {/* Outer halo */}
                {isHovered && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="8"
                    fill={lineColor}
                    fillOpacity="0.25"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? "5" : "4"}
                  fill="#FFFFFF"
                  stroke={lineColor}
                  strokeWidth={isHovered ? "3" : "2.5"}
                  className="transition-all duration-150"
                />

                {/* X-axis label */}
                <text
                  x={p.x}
                  y={height - paddingBottom + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isHovered ? "#3F342B" : "#7A6A5C"}
                  fontWeight={isHovered ? "700" : "500"}
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#3F342B] text-white text-[11px] px-3 py-1.5 rounded-xl shadow-lg pointer-events-none flex items-center gap-2"
          >
            <span>{points[hoveredIdx].label}:</span>
            <strong className="text-[#D9A441] font-bold">
              {points[hoveredIdx].value} {unit}
            </strong>
          </div>
        )}
      </div>
    </div>
  );
}
