"use client";

import React from "react";
import { GradebookReportData } from "@/actions/reports";

interface GradebookReportViewProps {
  data: GradebookReportData;
}

export function GradebookReportView({ data }: GradebookReportViewProps) {
  const printDateStr = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const {
    academicTerm,
    className,
    totalStudents,
    totalMaxPossibleScore,
    assignments,
    students,
    stats,
  } = data;

  return (
    <div className="space-y-4 text-[#2B2B2B] leading-relaxed">
      {/* Official Header */}
      <div className="text-center pb-3 border-b-2 border-[#3F342B]/40 space-y-1">
        <div className="inline-block px-3 py-0.5 rounded-md bg-[#FAF0E1] text-[#8C5D23] text-[11px] font-bold tracking-wider mb-1">
          ชุมนุมสื่อสร้างสรรค์ (3S Party • Creative Media Club)
        </div>
        <h1 className="text-base sm:text-lg font-bold text-[#222]">
          สมุดบันทึกผลการเรียนรู้และสรุปคะแนนรวม (Gradebook Summary Report)
        </h1>
        <p className="text-xs text-[#555] font-medium">
          ภาคเรียนที่ {academicTerm} • กลุ่มเป้าหมาย:{" "}
          <span className="font-bold text-[#222]">
            {className === "ALL" ? "นักเรียนทั้งหมดทุกห้อง" : `ห้อง ${className}`}
          </span>{" "}
          • วันที่ออกรายงาน: {printDateStr}
        </p>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block text-[10px]">จำนวนสมาชิก</span>
          <span className="font-bold text-slate-800 text-xs">{totalStudents} คน</span>
        </div>
        <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EADBCC] shadow-2xs">
          <span className="text-[#8C5D23] block text-[10px]">ภาระงานทั้งหมด</span>
          <span className="font-bold text-[#3F342B] text-xs">
            {assignments.length} ชิ้น (เต็ม {totalMaxPossibleScore} คะแนน)
          </span>
        </div>
        <div className="p-2 bg-emerald-50/70 rounded-lg border border-emerald-200 shadow-2xs">
          <span className="text-emerald-700 block text-[10px]">ผ่านเกณฑ์ (&ge; 50%)</span>
          <span className="font-bold text-emerald-800 text-xs">
            {stats.passedCount} คน (
            {totalStudents > 0 ? ((stats.passedCount / totalStudents) * 100).toFixed(0) : 0}%)
          </span>
        </div>
        <div className="p-2 bg-amber-50/70 rounded-lg border border-amber-200 shadow-2xs">
          <span className="text-amber-700 block text-[10px]">คะแนนเฉลี่ยรวม</span>
          <span className="font-bold text-amber-800 text-xs">
            {stats.avgTotalScore} ({stats.avgPercentage}%)
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden border border-slate-300 rounded-lg">
        <table className="w-full text-[10.5px] border-collapse">
          <thead>
            <tr className="bg-[#EFE9DF] text-[#333] font-bold border-b border-slate-300">
              <th className="py-2 px-1 text-center w-8 border-r border-slate-300">ลำดับ</th>
              <th className="py-2 px-1 text-center w-16 border-r border-slate-300">รหัส</th>
              <th className="py-2 px-2 text-left border-r border-slate-300">ชื่อ-สกุล</th>
              <th className="py-2 px-1 text-center w-10 border-r border-slate-300">ห้อง</th>
              <th className="py-2 px-1 text-center w-10 border-r border-slate-300">เลขที่</th>
              {assignments.map((a, i) => (
                <th
                  key={a.id}
                  className="py-2 px-1 text-center border-r border-slate-300 max-w-[90px] truncate"
                  title={`${a.title} (${a.maxScore} คะแนน)`}
                >
                  <div className="truncate">{a.title}</div>
                  <div className="text-[9px] font-normal text-slate-500">({a.maxScore} คะแนน)</div>
                </th>
              ))}
              <th className="py-2 px-1.5 text-center w-16 border-r border-slate-300 bg-[#E6DEC8]">
                <div>รวม</div>
                <div className="text-[9px] font-normal text-slate-600">({totalMaxPossibleScore})</div>
              </th>
              <th className="py-2 px-1 text-center w-12 border-r border-slate-300">ร้อยละ</th>
              <th className="py-2 px-1.5 text-center w-14">ผลประเมิน</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <tr
                  key={st.studentCode + idx}
                  className={`border-b border-slate-200 ${
                    isEven ? "bg-white" : "bg-[#FAF8F5]"
                  } hover:bg-amber-50/40`}
                >
                  <td className="py-1.5 px-1 text-center border-r border-slate-200 font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-1 text-center border-r border-slate-200 font-mono text-[10px]">
                    {st.studentCode}
                  </td>
                  <td className="py-1.5 px-2 text-left border-r border-slate-200 font-medium">
                    {st.name}
                  </td>
                  <td className="py-1.5 px-1 text-center border-r border-slate-200">
                    {st.className}
                  </td>
                  <td className="py-1.5 px-1 text-center border-r border-slate-200 font-mono">
                    {st.studentNumber}
                  </td>
                  {assignments.map((a) => {
                    const score = st.scores[a.id];
                    return (
                      <td
                        key={a.id}
                        className="py-1.5 px-1 text-center border-r border-slate-200 font-mono"
                      >
                        {score !== null && score !== undefined ? (
                          <span className="font-semibold text-slate-800">{score}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">0</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-1.5 px-1.5 text-center border-r border-slate-200 font-bold bg-[#FAF3E0] font-mono text-[#B94E48]">
                    {st.totalScore}
                  </td>
                  <td className="py-1.5 px-1 text-center border-r border-slate-200 font-mono text-slate-700">
                    {st.percentage}%
                  </td>
                  <td className="py-1.5 px-1 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        st.passed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {st.passed ? "ผ่าน" : "ไม่ผ่าน"}
                    </span>
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
            * สรุปผลการประเมินกิจกรรม: ได้คะแนนไม่ต่ำกว่าร้อยละ ๕๐ ถือว่า "ผ่าน"
          </p>
        </div>
        <div className="text-center space-y-2">
          <p className="font-semibold text-slate-700">ผู้รายงาน / ครูผู้สอน</p>
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
