"use client";

import React from "react";
import { StudentAttendanceRow } from "../AttendanceSheetClient";

interface AttendanceSessionReportViewProps {
  sessionTitle: string;
  sessionDate: string;
  academicTerm: string;
  sessionNote?: string | null;
  selectedClass?: string;
  records: StudentAttendanceRow[];
}

export function AttendanceSessionReportView({
  sessionTitle,
  sessionDate,
  academicTerm,
  sessionNote,
  selectedClass = "ALL",
  records,
}: AttendanceSessionReportViewProps) {
  const printDateStr = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedSessionDate = new Date(sessionDate).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const total = records.length;
  const present = records.filter((r) => r.status === "PRESENT").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const leave = records.filter((r) => r.status === "LEAVE").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const presentPercent = total > 0 ? (((present + late * 0.5) / total) * 100).toFixed(0) : 0;

  return (
    <div className="space-y-4 text-[#2B2B2B] leading-relaxed">
      {/* Official Header */}
      <div className="text-center pb-3 border-b-2 border-[#3F342B]/40 space-y-1">
        <div className="inline-block px-3 py-0.5 rounded-md bg-[#FAF0E1] text-[#8C5D23] text-[11px] font-bold tracking-wider mb-1">
          ชุมนุมสื่อสร้างสรรค์ (3S Party • Creative Media Club)
        </div>
        <h1 className="text-base sm:text-lg font-bold text-[#222]">
          แบบรายงานผลการเข้าร่วมกิจกรรมชุมนุมประจำรอบ
        </h1>
        <p className="text-xs text-[#555] font-medium">
          ภาคเรียนที่ {academicTerm} • กลุ่มเป้าหมาย:{" "}
          <span className="font-bold text-[#222]">
            {selectedClass === "ALL" ? "นักเรียนทั้งหมดทุกห้อง" : `ห้อง ${selectedClass}`}
          </span>
        </p>
      </div>

      {/* Session Details */}
      <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAF8F5] p-3 rounded-xl border border-[#EADBCC]">
        <div className="space-y-1">
          <div>
            <span className="text-[#666]">กิจกรรม: </span>
            <strong className="text-[#222] font-semibold">{sessionTitle}</strong>
          </div>
          <div>
            <span className="text-[#666]">วันที่จัดกิจกรรม: </span>
            <span className="text-[#444] font-medium">{formattedSessionDate}</span>
          </div>
          {sessionNote && (
            <div>
              <span className="text-[#666]">หมายเหตุ: </span>
              <span className="text-slate-600 italic">{sessionNote}</span>
            </div>
          )}
        </div>

        <div className="space-y-1 text-right">
          <div>
            <span className="text-[#666]">วันที่ออกรายงาน: </span>
            <span className="text-[#444]">{printDateStr}</span>
          </div>
          <div>
            <span className="text-[#666]">ร้อยละการเข้าร่วม: </span>
            <strong className="text-emerald-700 text-sm font-bold">{presentPercent}%</strong>
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-5 gap-2 text-center text-[11px]">
        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block text-[10px]">ทั้งหมด</span>
          <span className="font-bold text-slate-800 text-xs">{total} คน</span>
        </div>
        <div className="p-2 bg-emerald-50/70 rounded-lg border border-emerald-200 shadow-2xs">
          <span className="text-emerald-700 block text-[10px]">มาเรียน</span>
          <span className="font-bold text-emerald-800 text-xs">{present} คน</span>
        </div>
        <div className="p-2 bg-amber-50/70 rounded-lg border border-amber-200 shadow-2xs">
          <span className="text-amber-700 block text-[10px]">มาสาย</span>
          <span className="font-bold text-amber-800 text-xs">{late} คน</span>
        </div>
        <div className="p-2 bg-blue-50/70 rounded-lg border border-blue-200 shadow-2xs">
          <span className="text-blue-700 block text-[10px]">ลา</span>
          <span className="font-bold text-blue-800 text-xs">{leave} คน</span>
        </div>
        <div className="p-2 bg-rose-50/70 rounded-lg border border-rose-200 shadow-2xs">
          <span className="text-rose-700 block text-[10px]">ขาดเรียน</span>
          <span className="font-bold text-rose-800 text-xs">{absent} คน</span>
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
              <th className="py-2 px-2 text-center w-24 border-r border-slate-300">สถานะ</th>
              <th className="py-2 px-2 text-left">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec, idx) => {
              const isEven = idx % 2 === 0;

              let statusText = "ขาดเรียน";
              let statusStyle = "text-rose-700 bg-rose-50 border border-rose-200";
              if (rec.status === "PRESENT") {
                statusText = "มาเรียน";
                statusStyle = "text-emerald-800 bg-emerald-50 border border-emerald-200 font-semibold";
              } else if (rec.status === "LATE") {
                statusText = "มาสาย";
                statusStyle = "text-amber-800 bg-amber-50 border border-amber-200";
              } else if (rec.status === "LEAVE") {
                statusText = "ลา";
                statusStyle = "text-blue-700 bg-blue-50 border border-blue-200";
              }

              return (
                <tr
                  key={rec.studentId}
                  className={`border-b border-slate-200 ${
                    isEven ? "bg-white" : "bg-[#FAF8F5]"
                  } hover:bg-amber-50/40`}
                >
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono">
                    {rec.studentCode}
                  </td>
                  <td className="py-1.5 px-2 text-left border-r border-slate-200 font-medium">
                    {rec.firstName} {rec.lastName}
                  </td>
                  <td className="py-1.5 px-1 text-center border-r border-slate-200">
                    {rec.className}
                  </td>
                  <td className="py-1.5 px-1 text-center border-r border-slate-200 font-mono">
                    {rec.studentNumber}
                  </td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${statusStyle}`}>
                      {statusText}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-left text-slate-600 text-[10px]">
                    {rec.note || "-"}
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
            * การเช็กชื่อบันทึกผ่านระบบฐานข้อมูลออนไลน์ของชุมนุมสื่อสร้างสรรค์
          </p>
        </div>
        <div className="text-center space-y-2">
          <p className="font-semibold text-slate-700">ผู้บันทึก / ครูที่ปรึกษาชุมนุม</p>
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
