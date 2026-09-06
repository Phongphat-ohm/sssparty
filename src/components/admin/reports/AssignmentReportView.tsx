"use client";

import React from "react";
import { StudentSubmissionRow } from "../AssignmentSubmissionsClient";

interface AssignmentReportViewProps {
  assignmentTitle: string;
  maxScore: number;
  dueDate?: string;
  academicTerm?: string;
  selectedClass?: string;
  rows: StudentSubmissionRow[];
}

export function AssignmentReportView({
  assignmentTitle,
  maxScore,
  dueDate,
  academicTerm = "1/2569",
  selectedClass = "ALL",
  rows,
}: AssignmentReportViewProps) {
  const printDateStr = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น."
    : "-";

  // Calculate stats
  const totalStudents = rows.length;
  const submittedCount = rows.filter(
    (r) => r.status === "SUBMITTED" || r.status === "LATE" || r.status === "GRADED"
  ).length;
  const gradedCount = rows.filter((r) => r.status === "GRADED").length;
  const unsubmittedCount = totalStudents - submittedCount;

  const gradedRows = rows.filter((r) => typeof r.score === "number");
  const avgScore =
    gradedRows.length > 0
      ? (
          gradedRows.reduce((acc, r) => acc + (r.score || 0), 0) / gradedRows.length
        ).toFixed(1)
      : "-";

  const maxAttained =
    gradedRows.length > 0 ? Math.max(...gradedRows.map((r) => r.score || 0)) : "-";
  const minAttained =
    gradedRows.length > 0 ? Math.min(...gradedRows.map((r) => r.score || 0)) : "-";

  return (
    <div className="space-y-4 text-[#2B2B2B] leading-relaxed">
      {/* Official Header */}
      <div className="text-center pb-3 border-b-2 border-[#3F342B]/40 space-y-1">
        <div className="inline-block px-3 py-0.5 rounded-md bg-[#FAF0E1] text-[#8C5D23] text-[11px] font-bold tracking-wider mb-1">
          ชุมนุมสื่อสร้างสรรค์ (3S Party • Creative Media Club)
        </div>
        <h1 className="text-base sm:text-lg font-bold text-[#222]">
          แบบรายงานผลการส่งงานและการประเมินคะแนนภาระงาน
        </h1>
        <p className="text-xs text-[#555] font-medium">
          ภาคเรียนที่ {academicTerm} • กลุ่มเป้าหมาย:{" "}
          <span className="font-bold text-[#222]">
            {selectedClass === "ALL" ? "นักเรียนทั้งหมดทุกห้อง" : `ห้อง ${selectedClass}`}
          </span>
        </p>
      </div>

      {/* Assignment Meta Details & Summary Stats */}
      <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAF8F5] p-3 rounded-xl border border-[#EADBCC]">
        <div className="space-y-1">
          <div>
            <span className="text-[#666]">ชื่องาน: </span>
            <strong className="text-[#222] font-semibold">{assignmentTitle}</strong>
          </div>
          <div>
            <span className="text-[#666]">คะแนนเต็ม: </span>
            <strong className="text-[#222]">{maxScore} คะแนน</strong>
          </div>
          <div>
            <span className="text-[#666]">กำหนดส่ง: </span>
            <span className="text-[#444]">{formattedDueDate}</span>
          </div>
        </div>

        <div className="space-y-1 text-right">
          <div>
            <span className="text-[#666]">วันที่ออกรายงาน: </span>
            <span className="text-[#444]">{printDateStr}</span>
          </div>
          <div>
            <span className="text-[#666]">ส่งแล้ว: </span>
            <strong className="text-emerald-700">
              {submittedCount}/{totalStudents} คน (
              {totalStudents > 0 ? ((submittedCount / totalStudents) * 100).toFixed(0) : 0}%)
            </strong>
          </div>
          <div>
            <span className="text-[#666]">ตรวจแล้ว: </span>
            <span className="text-[#444]">{gradedCount} คน</span>
            <span className="text-[#666] ml-2">คะแนนเฉลี่ย: </span>
            <strong className="text-[#B94E48] font-bold">{avgScore}</strong>
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block text-[10px]">จำนวนทั้งหมด</span>
          <span className="font-bold text-slate-800 text-xs">{totalStudents} คน</span>
        </div>
        <div className="p-2 bg-emerald-50/70 rounded-lg border border-emerald-200 shadow-2xs">
          <span className="text-emerald-700 block text-[10px]">ส่งผลงานแล้ว</span>
          <span className="font-bold text-emerald-800 text-xs">{submittedCount} คน</span>
        </div>
        <div className="p-2 bg-amber-50/70 rounded-lg border border-amber-200 shadow-2xs">
          <span className="text-amber-700 block text-[10px]">ยังไม่ส่ง</span>
          <span className="font-bold text-amber-800 text-xs">{unsubmittedCount} คน</span>
        </div>
        <div className="p-2 bg-rose-50/70 rounded-lg border border-rose-200 shadow-2xs">
          <span className="text-rose-700 block text-[10px]">คะแนนสูงสุด/ต่ำสุด</span>
          <span className="font-bold text-rose-800 text-xs">
            {maxAttained} / {minAttained}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden border border-slate-300 rounded-lg">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-[#EFE9DF] text-[#333] font-bold border-b border-slate-300">
              <th className="py-2 px-2 text-center w-10 border-r border-slate-300">ลำดับ</th>
              <th className="py-2 px-2 text-center w-20 border-r border-slate-300">รหัสนักเรียน</th>
              <th className="py-2 px-2 text-left border-r border-slate-300">ชื่อ-สกุล</th>
              <th className="py-2 px-1 text-center w-12 border-r border-slate-300">ห้อง</th>
              <th className="py-2 px-1 text-center w-12 border-r border-slate-300">เลขที่</th>
              <th className="py-2 px-2 text-center w-20 border-r border-slate-300">สถานะ</th>
              <th className="py-2 px-2 text-center w-28 border-r border-slate-300">เวลาที่ส่ง</th>
              <th className="py-2 px-2 text-center w-20 border-r border-slate-300">
                คะแนน ({maxScore})
              </th>
              <th className="py-2 px-2 text-center w-16">ร้อยละ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isEven = idx % 2 === 0;
              const hasScore = typeof row.score === "number";
              const percent = hasScore && maxScore > 0 ? ((row.score! / maxScore) * 100).toFixed(0) : "-";

              let statusText = "ยังไม่ส่ง";
              let statusStyle = "text-rose-700 bg-rose-50 border border-rose-200";
              if (row.status === "GRADED") {
                statusText = "ตรวจแล้ว";
                statusStyle = "text-emerald-800 bg-emerald-50 border border-emerald-200 font-semibold";
              } else if (row.status === "SUBMITTED") {
                statusText = "รอตรวจ";
                statusStyle = "text-blue-700 bg-blue-50 border border-blue-200";
              } else if (row.status === "LATE") {
                statusText = "ส่งช้า";
                statusStyle = "text-amber-800 bg-amber-50 border border-amber-200";
              }

              const submittedTimeStr = row.submittedAt
                ? new Date(row.submittedAt).toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "-";

              return (
                <tr
                  key={row.studentId}
                  className={`border-b border-slate-200 ${
                    isEven ? "bg-white" : "bg-[#FAF8F5]"
                  } hover:bg-amber-50/40`}
                >
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono">
                    {row.studentCode}
                  </td>
                  <td className="py-1.5 px-2 text-left border-r border-slate-200 font-medium">
                    {row.firstName} {row.lastName}
                  </td>
                  <td className="py-1.5 px-1 text-center border-r border-slate-200">
                    {row.className}
                  </td>
                  <td className="py-1.5 px-1 text-center border-r border-slate-200 font-mono">
                    {row.studentNumber}
                  </td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${statusStyle}`}>
                      {statusText}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 text-slate-600 text-[10px]">
                    {submittedTimeStr}
                  </td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 font-bold">
                    {hasScore ? (
                      <span className="text-[#B94E48]">{row.score}</span>
                    ) : (
                      <span className="text-slate-400 font-normal">-</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-700">
                    {percent !== "-" ? `${percent}%` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Signature Section */}
      <div className="pt-6 grid grid-cols-2 gap-8 text-xs break-inside-avoid">
        <div>
          <p className="text-[11px] text-slate-500">
            * เกณฑ์การให้คะแนนอ้างอิงตามเกณฑ์รูบริก (Rubric Assessment) ที่ระบุในระบบ
          </p>
        </div>
        <div className="text-center space-y-2">
          <p className="font-semibold text-slate-700">ผู้รายงาน / ครูที่ปรึกษาชุมนุม</p>
          <div className="pt-8">
            <p>ลงชื่อ........................................................................</p>
            <p className="text-[11px] text-slate-600 mt-1">(........................................................................)</p>
            <p className="text-[11px] text-slate-500 mt-1">
              วันที่ .......... เดือน .............................. พ.ศ. ...............
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
