"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  UserX,
  FileSpreadsheet,
  Info,
} from "lucide-react";
import { evaluateLocationStatus, formatDistance } from "@/lib/attendance/geo-utils";

export interface StudentAuditLocationRow {
  studentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  className: string;
  studentNumber: number;
  status: "PRESENT" | "LATE" | "LEAVE" | "ABSENT";
  checkInMethod?: string | null;
  checkedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  distanceFromSession?: number | null;
  hasLocation: boolean;
  ipAddress?: string | null;
}

interface Props {
  sessionId: string;
  records: StudentAuditLocationRow[];
  centerCoords?: { latitude: number; longitude: number; expectedRadius?: number } | null;
  onUpdateStatus?: (studentId: string, newStatus: "PRESENT" | "ABSENT") => void;
}

export function AttendanceLocationAuditTab({
  sessionId,
  records,
  centerCoords,
  onUpdateStatus,
}: Props) {
  const [filterType, setFilterType] = useState<
    "ALL" | "WITH_LOCATION" | "SUSPICIOUS" | "NO_LOCATION"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const expectedRadius = centerCoords?.expectedRadius || 100;

  // Calculate statistics
  const total = records.length;
  const withLocation = records.filter((r) => r.hasLocation && r.latitude && r.longitude).length;
  const withoutLocation = total - withLocation;

  const suspicious = records.filter((r) => {
    if (!r.hasLocation || r.distanceFromSession === null || r.distanceFromSession === undefined) {
      return false;
    }
    return r.distanceFromSession > expectedRadius;
  }).length;

  const normalInZone = records.filter((r) => {
    if (!r.hasLocation || r.distanceFromSession === null || r.distanceFromSession === undefined) {
      return false;
    }
    return r.distanceFromSession <= expectedRadius;
  }).length;

  // Filter records
  const filtered = records.filter((r) => {
    // Filter type
    if (filterType === "WITH_LOCATION" && (!r.hasLocation || !r.latitude)) return false;
    if (filterType === "NO_LOCATION" && r.hasLocation && r.latitude) return false;
    if (filterType === "SUSPICIOUS") {
      if (!r.hasLocation || r.distanceFromSession === null || r.distanceFromSession === undefined) {
        return false;
      }
      if (r.distanceFromSession <= expectedRadius) return false;
    }

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.studentCode.toLowerCase().includes(q) ||
      r.className.toLowerCase().includes(q) ||
      r.studentNumber.toString() === q
    );
  });

  return (
    <div className="space-y-5">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#EBE3D5] shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-[#7A6A5C] block">
            นักเรียนทั้งหมด
          </span>
          <div className="flex items-baseline gap-1">
            <strong className="text-2xl font-black text-[#3F342B]">{total}</strong>
            <span className="text-xs text-[#7A6A5C]">คน</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-800 block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            อยู่ในพื้นที่ (&le; {expectedRadius}ม.)
          </span>
          <div className="flex items-baseline gap-1">
            <strong className="text-2xl font-black text-emerald-700">{normalInZone}</strong>
            <span className="text-xs text-emerald-800">คน</span>
          </div>
        </div>

        <div className="bg-red-50/70 p-4 rounded-2xl border border-red-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-red-800 block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            อยู่นอกพื้นที่ (&gt; {expectedRadius}ม.)
          </span>
          <div className="flex items-baseline gap-1">
            <strong className="text-2xl font-black text-red-700">{suspicious}</strong>
            <span className="text-xs text-red-800">คน</span>
          </div>
        </div>

        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-stone-600 block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-stone-400" />
            ไม่ได้แชร์พิกัด
          </span>
          <div className="flex items-baseline gap-1">
            <strong className="text-2xl font-black text-stone-700">{withoutLocation}</strong>
            <span className="text-xs text-stone-600">คน</span>
          </div>
        </div>
      </div>

      {/* 2. Pinpoint Info Banner */}
      <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
        <div className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
          <div className="leading-relaxed">
            <span className="font-bold">พิกัดห้องเรียนอ้างอิง: </span>
            {centerCoords && centerCoords.latitude && centerCoords.longitude ? (
              <span>
                ละติจูด {centerCoords.latitude.toFixed(5)}, ลองจิจูด {centerCoords.longitude.toFixed(5)} (รัศมีอ้างอิง {expectedRadius} เมตร)
              </span>
            ) : (
              <span className="text-amber-800 italic">
                ยังไม่ได้ปักหมุดพิกัดห้องเรียนในรอบนี้ (สามารถกด &quot;ปักหมุดพิกัด&quot; ในโหมดฉายโปรเจกเตอร์เพื่อคำนวณระยะห่าง)
              </span>
            )}
          </div>
        </div>

        <Link
          href="/admin/logs?targetType=ATTENDANCE"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-amber-900 font-bold border border-amber-300 shadow-2xs hover:bg-amber-100 self-start sm:self-auto transition-all"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>ดูบันทึก Audit Logs ทั้งหมด</span>
        </Link>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-[#EBE3D5] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === "ALL"
                ? "bg-[#5C4A3A] text-white shadow-2xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            ทั้งหมด ({total})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("WITH_LOCATION")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === "WITH_LOCATION"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            แชร์พิกัด ({withLocation})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("SUSPICIOUS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === "SUSPICIOUS"
                ? "bg-red-600 text-white shadow-2xs"
                : "bg-red-50 text-red-700 hover:bg-red-100"
            }`}
          >
            🚨 อยู่นอกพื้นที่ ({suspicious})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("NO_LOCATION")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === "NO_LOCATION"
                ? "bg-stone-700 text-white shadow-2xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            ไม่มีพิกัด ({withoutLocation})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัส, ชั้น..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
      </div>

      {/* 4. Table */}
      <div className="bg-white rounded-3xl border border-[#EBE3D5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#EBE3D5] text-[#7A6A5C] font-bold">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">นักเรียน</th>
                <th className="py-3 px-4">ชั้น/เลขที่</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4">วิธีการเช็ก</th>
                <th className="py-3 px-4">เวลาที่บันทึก</th>
                <th className="py-3 px-4">ระยะห่าง</th>
                <th className="py-3 px-4">การประเมิน</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBE3D5]/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-400">
                    ไม่พบรายการข้อมูลที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => {
                  const evalResult = evaluateLocationStatus({
                    hasLocation: row.hasLocation,
                    distanceFromSession: row.distanceFromSession,
                    accuracy: row.locationAccuracy,
                    expectedRadius,
                  });

                  const hasCoords = row.hasLocation && row.latitude && row.longitude;
                  const googleMapsUrl = hasCoords
                    ? `https://www.google.com/maps?q=${row.latitude},${row.longitude}`
                    : null;

                  const timeStr = row.checkedAt
                    ? new Date(row.checkedAt).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-";

                  return (
                    <tr
                      key={row.studentId}
                      className={`hover:bg-amber-50/40 transition-colors ${
                        evalResult.status === "SUSPICIOUS_FAR" ? "bg-red-50/20" : ""
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-mono text-stone-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-[#3F342B]">
                          {row.firstName} {row.lastName}
                        </p>
                        <p className="text-[10px] text-[#7A6A5C] font-mono">
                          {row.studentCode}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-[#5C4A3A]">
                        {row.className} เลขที่ {row.studentNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            row.status === "PRESENT"
                              ? "bg-emerald-100 text-emerald-800"
                              : row.status === "LATE"
                              ? "bg-amber-100 text-amber-800"
                              : row.status === "LEAVE"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                          {row.checkInMethod || "MANUAL"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#5C4A3A] font-mono">
                        {timeStr} น.
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#3F342B]">
                        {formatDistance(row.distanceFromSession)}
                        {row.locationAccuracy && (
                          <span className="text-[10px] text-stone-400 block font-normal">
                            ±{Math.round(row.locationAccuracy)}ม.
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${evalResult.badgeColor}`}
                        >
                          {evalResult.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {googleMapsUrl && (
                            <a
                              href={googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="เปิดดูตำแหน่งจริงบน Google Maps"
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-emerald-100 text-stone-600 hover:text-emerald-700 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {onUpdateStatus && row.status !== "ABSENT" && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(row.studentId, "ABSENT")}
                              title="ปรับสถานะเป็น ขาดเรียน"
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                            >
                              ปรับขาด
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
