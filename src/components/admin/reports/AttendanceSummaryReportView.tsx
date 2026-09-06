"use client";

import React from "react";
import { AttendanceSummaryReportData } from "@/actions/reports";

interface AttendanceSummaryReportViewProps {
  data: AttendanceSummaryReportData;
}

export function AttendanceSummaryReportView({ data }: AttendanceSummaryReportViewProps) {
  const printDateStr = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const {
    academicTerm,
    className,
    totalStudents,
    totalSessions,
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
          แบบรายงานสรุปเวลาเรียนกิจกรรมพัฒนาผู้เรียน (กิจกรรมชุมนุม)
        </h1>
        <p className="text-xs text-[#555] font-medium">
          ภาคเรียนที่ {academicTerm} • กลุ่มเป้าหมาย:{" "}
          <span className="font-bold text-[#222]">
            {className === "ALL" ? "นักเรียนทั้งหมดทุกห้อง" : `ห้อง ${className}`}
          </span>{" "}
          • วันที่ออกรายงาน: {printDateStr}
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block text-[10px]">จำนวนสมาชิก</span>
          <span className="font-bold text-slate-800 text-xs">{totalStudents} คน</span>
        </div>
        <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#EADBCC] shadow-2xs">
          <span className="text-[#8C5D23] block text-[10px]">จำนวนคาบทั้งหมด</span>
          <span className="font-bold text-[#3F342B] text-xs">{totalSessions} คาบ</span>
        </div>
        <div className="p-2 bg-emerald-50/70 rounded-lg border border-emerald-200 shadow-2xs">
          <span className="text-emerald-700 block text-[10px]">ผ่านเกณฑ์เวลาเรียน (&ge; 80%)</span>
          <span className="font-bold text-emerald-800 text-xs">
            {stats.passedCount} คน (
            {totalStudents > 0 ? ((stats.passedCount / totalStudents) * 100).toFixed(0) : 0}%)
          </span>
        </div>
        <div className="p-2 bg-rose-50/70 rounded-lg border border-rose-200 shadow-2xs">
          <span className="text-rose-700 block text-[10px]">ไม่ผ่านเกณฑ์เวลาเรียน (มส.)</span>
          <span className="font-bold text-rose-800 text-xs">{stats.failedCount} คน</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden border border-slate-300 rounded-lg">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-[#EFE9DF] text-[#333] font-bold border-b border-slate-300">
              <th className="py-2 px-1 text-center w-8 border-r border-slate-300">ลำดับ</th>
              <th className="py-2 px-2 text-center w-20 border-r border-slate-300">รหัส</th>
              <th className="py-2 px-2 text-left border-r border-slate-300">ชื่อ-สกุล</th>
              <th className="py-2 px-1 text-center w-12 border-r border-slate-300">ห้อง</th>
              <th className="py-2 px-1 text-center w-10 border-r border-slate-300">เลขที่</th>
              <th className="py-2 px-1 text-center w-14 border-r border-slate-300 text-emerald-800">
                มา (ครั้ง)
              </th>
              <th className="py-2 px-1 text-center w-14 border-r border-slate-300 text-amber-800">
                สาย (ครั้ง)
              </th>
              <th className="py-2 px-1 text-center w-12 border-r border-slate-300 text-blue-800">
                ลา (ครั้ง)
              </th>
              <th className="py-2 px-1 text-center w-14 border-r border-slate-300 text-rose-800">
                ขาด (ครั้ง)
              </th>
              <th className="py-2 px-1.5 text-center w-16 border-r border-slate-300 bg-[#E6DEC8]">
                <div>รวมคาบ</div>
                <div className="text-[9px] font-normal text-slate-600">({totalSessions})</div>
              </th>
              <th className="py-2 px-1 text-center w-16 border-r border-slate-300">ร้อยละ</th>
              <th className="py-2 px-2 text-center w-20">ผลประเมิน</th>
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
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono text-[10px]">
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
                  <td className="py-1.5 px-1 text-center border-r border-slate-200 font-mono text-emerald-800 font-semibold">
                    {st.present}
                  </td>
                  <td className="py-1.5 px-1 text-center border-r border-slate-200 font-mono text-amber-700">
                    {st.late}
                  </td>
                  <td className="py-1.5 px-1 text-center border-r border-slate-200 font-mono text-blue-700">
                    {st.leave}
                  </td>
                  <td className="py-1.5 px-1 text-center border-r border-slate-200 font-mono text-rose-700">
                    {st.absent}
                  </td>
                  <td className="py-1.5 px-1.5 text-center border-r border-slate-200 font-mono bg-[#FAF3E0] text-slate-800">
                    {totalSessions}
                  </td>
                  <td className="py-1.5 px-1 text-center border-r border-slate-200 font-mono font-bold text-slate-800">
                    {st.percentage}%
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        st.passed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {st.passed ? "ผ่าน" : "ไม่ผ่าน (มส.)"}
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
            * ตามระเบียบกระทรวงศึกษาธิการ นักเรียนต้องมีเวลาเข้าร่วมกิจกรรมไม่น้อยกว่าร้อยละ ๘๐ จึงจะได้รับการตัดสิน "ผ่าน"
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
