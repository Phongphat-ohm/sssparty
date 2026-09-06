"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  UserX,
  AlertCircle,
  Trash2,
  Sparkles,
  List,
  Search,
  Users,
  ExternalLink,
  Flag,
  FileSpreadsheet,
  FileText,
  Printer,
  Loader2,
} from "lucide-react";
import { TablePagination } from "@/components/ui/TablePagination";
import { SortableTableHeader, SortOrder } from "@/components/ui/SortableTableHeader";
import {
  createAttendanceSessionForDateAction,
  deleteAttendanceSessionAction,
} from "@/actions/attendance";
import {
  getAttendanceSummaryReportDataAction,
  AttendanceSummaryReportData,
} from "@/actions/reports";
import { PdfReportModal } from "@/components/admin/PdfReportModal";
import { generateAttendanceSummaryReportHtml } from "@/lib/export/report-html-templates";
import { showCozyConfirm, showCozySuccess, showCozyError } from "@/lib/ui/swal";
import { getThaiHolidaysMap, ThaiHolidayInfo } from "@/lib/utils/holidays";
import { getNextReportCodeAction } from "@/actions/reports-history";

export interface SessionItem {
  id: string;
  title: string;
  date: string;
  academicTerm: string;
  note?: string | null;
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
  attendanceRate: number;
}

interface AttendanceSessionsListClientProps {
  initialSessions: SessionItem[];
}

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export function AttendanceSessionsListClient({
  initialSessions,
}: AttendanceSessionsListClientProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionItem[]>(initialSessions);

  // Map sessions by date: YYYY-MM-DD
  const sessionsByDate = new Map<string, SessionItem>();
  sessions.forEach((s) => {
    const dateKey = new Date(s.date).toISOString().split("T")[0];
    sessionsByDate.set(dateKey, s);
  });

  // Calendar month state
  const initialDate = sessions.length > 0 ? new Date(sessions[0].date) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());

  // Holidays Map from date-holidays library
  const holidaysMap = useMemo(() => getThaiHolidaysMap(currentYear), [currentYear]);

  // Selected date state (defaults to first session or today)
  const todayKey = new Date().toISOString().split("T")[0];
  const [selectedDateKey, setSelectedDateKey] = useState<string>(
    sessions.length > 0 ? new Date(sessions[0].date).toISOString().split("T")[0] : todayKey
  );

  // View mode: 'calendar' (default) or 'list'
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [isCreating, setIsCreating] = useState(false);

  // PDF Report State
  const [attendanceReportData, setAttendanceReportData] = useState<AttendanceSummaryReportData | null>(null);
  const [isLoadingAttendanceReport, setIsLoadingAttendanceReport] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const handleOpenAttendanceSummaryPdf = async () => {
    setIsLoadingAttendanceReport(true);
    let defaultDocCode = "DOC-3S-2569-0001";
    try {
      const codeRes = await getNextReportCodeAction();
      if (codeRes.success && codeRes.code) {
        defaultDocCode = codeRes.code;
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingAttendanceReport(false);
    }

    const result = await showCozyConfirm({
      title: "ยืนยันการสร้างรายงานสรุปเวลาเรียน",
      html: `
        <div class="text-left text-sm space-y-3 mt-2 text-[#5C4D3C]">
          <div>
            <span class="text-xs text-[#7A6A5C]">หัวข้อรายงาน:</span>
            <p class="font-bold text-[#3F342B]">แบบรายงานสรุปเวลาเรียนกิจกรรมพัฒนาผู้เรียน (กิจกรรมชุมนุม)</p>
          </div>
          <div>
            <span class="text-xs text-[#7A6A5C]">กลุ่มเป้าหมาย:</span>
            <p class="font-bold text-[#3F342B]">นักเรียนทั้งหมดทุกห้อง</p>
          </div>
          <div class="pt-1">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-[#3F342B] flex items-center gap-1">
                🔒 รหัสเอกสาร (Doc Code):
              </span>
              <span class="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-300">
                ระบบสร้างอัตโนมัติ (ห้ามแก้ไข)
              </span>
            </div>
            <div class="w-full px-3.5 py-2.5 text-xs font-mono font-black bg-[#FAF0E1]/80 border border-[#D9CABB] rounded-xl text-[#3F342B] tracking-wider select-all flex items-center justify-between shadow-2xs">
              <span>${defaultDocCode}</span>
              <span class="text-[10px] font-sans font-semibold text-[#7A6A5C] bg-white px-2 py-0.5 rounded-md border border-[#EADBCC]">
                Official
              </span>
            </div>
            <p class="text-[11px] text-[#A8988B] mt-1.5">
              * รหัสเอกสารสร้างโดยระบบอัตโนมัติตามลำดับปีการศึกษา เพื่อความถูกต้องของเอกสารราชการและ QR Code (ไม่สามารถแก้ไขได้)
            </p>
          </div>
          <div class="p-3 bg-[#FAF0E1] border border-[#EADBCC] rounded-xl text-xs text-[#8C5D23] leading-relaxed">
            ℹ️ ระบบจะส่งข้อมูลไปยัง Qorstack Template API (Report 2), จัดเก็บสำเนาบน S3 และบันทึกประวัติการพิมพ์ในนามของคุณ
          </div>
        </div>
      `,
      confirmText: "ยืนยันและสร้างรายงาน",
      cancelText: "ยกเลิก",
      icon: "info",
    });

    if (!result.isConfirmed) {
      return;
    }

    setIsPdfModalOpen(true);
  };

  // List view search & sort & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTerm, setSelectedTerm] = useState<string>("ALL");
  const [sortField, setSortField] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const terms = Array.from(new Set(sessions.map((s) => s.academicTerm)));

  // Calendar navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Generate calendar cells
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarDays: {
    dayNumber: number;
    dateKey: string;
    isCurrentMonth: boolean;
    session?: SessionItem;
    holiday?: ThaiHolidayInfo;
  }[] = [];

  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const m = currentMonth === 0 ? 12 : currentMonth;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    const key = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    calendarDays.push({
      dayNumber: day,
      dateKey: key,
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    calendarDays.push({
      dayNumber: d,
      dateKey: key,
      isCurrentMonth: true,
      session: sessionsByDate.get(key),
      holiday: holidaysMap[key],
    });
  }

  const remainingCells = (7 - (calendarDays.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const m = currentMonth === 11 ? 1 : currentMonth + 2;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    const key = `${y}-${String(m).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    calendarDays.push({
      dayNumber: i,
      dateKey: key,
      isCurrentMonth: false,
    });
  }

  const selectedSession = sessionsByDate.get(selectedDateKey);
  const selectedHoliday = holidaysMap[selectedDateKey];

  // Click on date cell:
  // If session exists -> selects it
  // If session does NOT exist -> asks confirmation to create it automatically!
  const handleDateClick = async (dateKey: string) => {
    setSelectedDateKey(dateKey);
    const existing = sessionsByDate.get(dateKey);

    if (existing) {
      return;
    }

    // Date does not have a session: Ask if user wants to create one automatically
    await promptCreateSessionForDate(dateKey);
  };

  const promptCreateSessionForDate = async (dateKey: string) => {
    const d = new Date(dateKey);
    const thaiFormatted = d.toLocaleDateString("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const holidayOnDate = holidaysMap[dateKey];

    const confirmed = await showCozyConfirm({
      title: "สร้างรอบเช็กชื่อกิจกรรม?",
      html: `
        <div class="space-y-2 text-left text-xs text-[#5A4D41]">
          <p>คุณต้องการสร้างรอบเช็กชื่อสำหรับวันที่:</p>
          <p class="font-bold text-sm text-[#B94E48] bg-[#FAF0E1] p-2.5 rounded-xl border border-[#EADBCC] text-center">
            📅 ${thaiFormatted}
          </p>
          ${
            holidayOnDate
              ? `<div class="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span>🚩</span>
                  <span><strong>วันหยุดราชการ:</strong> ${holidayOnDate.name}</span>
                </div>`
              : ""
          }
          <p class="text-[11px] text-[#7A6A5C]">
            ⚡ <strong>ความสะดวกรวดเร็ว:</strong> ระบบจะตั้งชื่อหัวข้อกิจกรรมให้อัตโนมัติ (เช่น "กิจกรรมชุมนุม ครั้งที่...") และเตรียมรายชื่อนักเรียนทุกคนให้พร้อมเช็กชื่อทันที
          </p>
        </div>
      `,
      confirmText: "สร้างและเริ่มเช็กชื่อ",
      cancelText: "ยกเลิก",
      icon: "question",
    });

    if (!confirmed.isConfirmed) return;

    setIsCreating(true);
    try {
      const res = await createAttendanceSessionForDateAction(dateKey);
      if (res.success && res.sessionId) {
        await showCozySuccess("สำเร็จ!", res.message);
        router.push(`/admin/attendance/${res.sessionId}`);
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (sessionId: string, title: string) => {
    const confirmed = await showCozyConfirm(
      "ยืนยันการลบรอบเช็กชื่อ?",
      `คุณต้องการลบ "${title}" ใช่หรือไม่? บันทึกการเข้าเรียนของรอบนี้จะถูกลบไปด้วย`
    );
    if (!confirmed.isConfirmed) return;

    try {
      const res = await deleteAttendanceSessionAction(sessionId);
      if (res.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        await showCozySuccess("ลบสำเร็จ!", res.message);
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    }
  };

  // List view sort & pagination
  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === "asc") setSortOrder("desc");
      else if (sortOrder === "desc") {
        setSortField("date");
        setSortOrder("desc");
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const filtered = sessions.filter((s) => {
    const matchTerm = selectedTerm === "ALL" || s.academicTerm === selectedTerm;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      (s.note && s.note.toLowerCase().includes(q));
    return matchTerm && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortField || !sortOrder) return 0;
    let valA: any = (a as any)[sortField];
    let valB: any = (b as any)[sortField];

    if (sortField === "date") {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginatedSessions = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3F342B] tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-[#B94E48]" />
            ระบบเช็กชื่อกิจกรรมชุมนุม
          </h1>
          <p className="text-xs sm:text-sm text-[#7A6A5C]">
            คลิกเลือกวันที่ในปฏิทินเพื่อเริ่มเช็กชื่อ พร้อมแสดงวันหยุดราชการภาษาไทยอัตโนมัติ
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <a
            href="/api/export/attendance"
            download
            title="ส่งออกสรุปเวลาเรียนกิจกรรมชุมนุมเป็นไฟล์ Excel/CSV"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl font-semibold text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-all shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export สรุปเวลาเรียน (.csv)</span>
          </a>

          <button
            type="button"
            onClick={handleOpenAttendanceSummaryPdf}
            disabled={isLoadingAttendanceReport}
            title="พรีวิวและพิมพ์รายงานสรุปเวลาเรียน / บันทึกเป็น PDF"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl font-semibold text-xs text-[#3F342B] bg-[#FAF0E1] hover:bg-[#3F342B] hover:text-white border border-[#D9CABB] active:scale-95 disabled:opacity-60 transition-all shadow-2xs cursor-pointer"
          >
            {isLoadingAttendanceReport ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>พิมพ์สรุปเวลาเรียน (Print / PDF)</span>
          </button>

          {/* View Toggle */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#EADBCC] shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-[#D9A441] text-white shadow-2xs"
                  : "text-[#7A6A5C] hover:text-[#3F342B]"
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>ปฏิทิน (Calendar)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-[#D9A441] text-white shadow-2xs"
                  : "text-[#7A6A5C] hover:text-[#3F342B]"
              }`}
            >
              <List className="w-4 h-4" />
              <span>ตารางทั้งหมด ({sessions.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CALENDAR VIEW (Default) */}
      {viewMode === "calendar" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Calendar Card */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-[#EADBCC] shadow-xs p-5 space-y-4">
            {/* Calendar Header with Navigation */}
            <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center font-bold">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-[#3F342B]">
                    {THAI_MONTHS[currentMonth]} {currentYear + 543}
                  </h2>
                  <span className="text-[11px] text-[#7A6A5C]">
                    คลิกวันที่เพื่อเริ่มเช็กชื่อ (มีแสดงวันหยุดนักขัตฤกษ์ 🚩)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl border border-[#EADBCC] text-[#5A4D41] hover:bg-[#FAF6F0] transition-colors cursor-pointer"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl border border-[#EADBCC] text-[#5A4D41] hover:bg-[#FAF6F0] transition-colors cursor-pointer"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 text-center text-xs font-bold text-[#7A6A5C]">
              {WEEKDAYS.map((day, idx) => (
                <div key={day} className={`py-1 ${idx === 0 ? "text-red-500" : ""}`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarDays.map((cd, idx) => {
                const hasSession = !!cd.session;
                const isSelected = selectedDateKey === cd.dateKey;
                const isToday = cd.dateKey === todayKey;
                const isHoliday = !!cd.holiday;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!cd.isCurrentMonth || isCreating}
                    onClick={() => handleDateClick(cd.dateKey)}
                    className={`min-h-[76px] sm:min-h-[86px] p-2 rounded-2xl flex flex-col justify-between transition-all cursor-pointer border text-left group relative overflow-hidden ${
                      !cd.isCurrentMonth
                        ? "opacity-25 border-transparent cursor-default"
                        : isSelected
                        ? "border-[#D9A441] bg-[#FFF9F0] shadow-sm scale-102 ring-2 ring-[#D9A441]/30"
                        : hasSession
                        ? "border-[#EADBCC] bg-[#FAF6F0]/70 hover:bg-[#FFF9F0] hover:border-[#D9A441]"
                        : isHoliday
                        ? "border-rose-200 bg-rose-50/40 hover:bg-rose-50 hover:border-rose-300"
                        : "border-dashed border-[#EADBCC]/80 bg-white hover:bg-[#FAF6F0]/50 hover:border-[#D9A441]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-bold ${
                          isToday
                            ? "w-6 h-6 rounded-full bg-[#B94E48] text-white flex items-center justify-center -ml-1 -mt-1 shadow-2xs"
                            : isSelected
                            ? "text-[#D9A441]"
                            : isHoliday
                            ? "text-rose-600 font-extrabold"
                            : cd.isCurrentMonth
                            ? "text-[#3F342B]"
                            : "text-[#A8988B]"
                        }`}
                      >
                        {cd.dayNumber}
                      </span>

                      {hasSession && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                          {cd.session?.attendanceRate}%
                        </span>
                      )}

                      {!hasSession && isHoliday && (
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1 py-0.5 rounded-md flex items-center gap-0.5">
                          <Flag className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    {/* Holiday badge or Session Indicator */}
                    <div className="space-y-0.5 w-full">
                      {isHoliday && (
                        <span
                          className="block text-[9px] font-semibold text-rose-700 truncate leading-tight bg-rose-50/80 px-1 py-0.5 rounded"
                          title={cd.holiday?.name}
                        >
                          🚩 {cd.holiday?.name}
                        </span>
                      )}

                      {hasSession ? (
                        <div className="space-y-0.5">
                          <span className="block text-[10px] font-bold text-[#3F342B] truncate leading-tight">
                            {cd.session?.title}
                          </span>
                          <div className="flex items-center gap-1 text-[9px] text-[#7A6A5C]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>มา {cd.session?.presentCount} คน</span>
                          </div>
                        </div>
                      ) : !isHoliday ? (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-[#D9A441] font-bold">
                          <Plus className="w-3 h-3" />
                          <span>สร้าง</span>
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#F2E8DC] text-[11px] text-[#7A6A5C]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#FAF0E1] border border-[#D9CABB]" />
                  <span>มีรอบเช็กชื่อแล้ว</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-100 border border-rose-300" />
                  <span>วันหยุดราชการ (Holiday)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md border border-dashed border-[#D9CABB]" />
                  <span>คลิกเพื่อสร้างรอบอัตโนมัติ</span>
                </span>
              </div>

              <span className="text-[#A8988B]">
                จำนวนรอบทั้งหมด: <strong>{sessions.length}</strong> รอบ
              </span>
            </div>
          </div>

          {/* Right Panel: Selected Date Action Card */}
          <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D9A441]" />
                  <h3 className="font-bold text-sm text-[#3F342B]">
                    ข้อมูลวันที่เลือก
                  </h3>
                </div>

                <span className="text-xs font-semibold text-[#7A6A5C] bg-[#FAF6F0] px-2.5 py-1 rounded-lg">
                  {new Date(selectedDateKey).toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Holiday Alert Banner if selected date is a holiday */}
              {selectedHoliday && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5 font-medium animate-in fade-in">
                  <span className="text-lg">🚩</span>
                  <div>
                    <span className="font-bold block text-rose-900">{selectedHoliday.name}</span>
                    <span className="text-[10px] text-rose-600">วันหยุดราชการ / วันหยุดสำคัญประจำปี</span>
                  </div>
                </div>
              )}

              {selectedSession ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <span className="text-[11px] text-[#7A6A5C] block">หัวข้อกิจกรรม</span>
                    <h4 className="text-base font-bold text-[#3F342B] leading-tight mt-0.5">
                      {selectedSession.title}
                    </h4>
                    <p className="text-xs text-[#7A6A5C] mt-1 flex items-center gap-2">
                      <span>ภาคเรียน: <strong>{selectedSession.academicTerm}</strong></span>
                      {selectedSession.note && (
                        <>
                          <span>•</span>
                          <span>{selectedSession.note}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Attendance Stats Cards */}
                  <div className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#EADBCC] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5A4D41]">
                        อัตราการเข้าเรียน
                      </span>
                      <strong className="text-base font-extrabold text-[#3F342B]">
                        {selectedSession.attendanceRate}%
                      </strong>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[#EADBCC] overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${selectedSession.attendanceRate}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>มา: {selectedSession.presentCount} คน</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>สาย: {selectedSession.lateCount} คน</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sky-700 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>ลา: {selectedSession.leaveCount} คน</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-red-700 font-semibold">
                        <UserX className="w-3.5 h-3.5" />
                        <span>ขาด: {selectedSession.absentCount} คน</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <Link
                      href={`/admin/attendance/${selectedSession.id}`}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-white bg-[#D9A441] hover:bg-[#C28F30] active:scale-98 transition-all shadow-md cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>เปิดห้องเช็กชื่อ / แก้ไขข้อมูล</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(selectedSession.id, selectedSession.title)
                      }
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบรอบเช็กชื่อนี้</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center space-y-3 bg-[#FAF6F0] rounded-2xl border border-[#EADBCC]">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#D9A441] flex items-center justify-center mx-auto border border-[#EADBCC]">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#3F342B]">
                      ยังไม่มีรอบเช็กชื่อในวันที่เลือก
                    </h4>
                    <p className="text-[11px] text-[#7A6A5C] mt-1">
                      คลิกปุ่มด้านล่างเพื่อสร้างรอบเช็กชื่อใหม่ทันที โดยโปรแกรมจะตั้งชื่อให้อัตโนมัติ
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => promptCreateSessionForDate(selectedDateKey)}
                    disabled={isCreating}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white bg-[#B94E48] hover:bg-[#A33F39] active:scale-95 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>สร้างรอบเช็กชื่อสำหรับวันนี้</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 bg-[#FFF9F0] rounded-2xl border border-[#EADBCC] text-[11px] text-[#7A6A5C] leading-relaxed">
              💡 <strong>คำแนะนำ:</strong> คุณสามารถคลิกวันที่ย้อนหลังเพื่อสร้างรอบเช็กชื่อหรือแก้ไขการเข้าเรียนย้อนหลังได้ตลอดเวลา
            </div>
          </div>
        </div>
      )}

      {/* 3. LIST / TABLE VIEW (Alternative) */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedTerm("ALL");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedTerm === "ALL"
                    ? "bg-[#D9A441] text-white shadow-2xs"
                    : "bg-[#FAF6F0] text-[#7A6A5C] hover:bg-[#FAF0E1]"
                }`}
              >
                ทุกภาคเรียน
              </button>

              {terms.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setSelectedTerm(term);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedTerm === term
                      ? "bg-[#D9A441] text-white shadow-2xs"
                      : "bg-[#FAF6F0] text-[#7A6A5C] hover:bg-[#FAF0E1]"
                  }`}
                >
                  เทอม {term}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#A8988B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ค้นหาหัวข้อกิจกรรม..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#FAF6F0] border-b border-[#EADBCC]">
                  <tr>
                    <SortableTableHeader
                      label="วันที่กิจกรรม"
                      field="date"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      className="pl-5"
                    />
                    <SortableTableHeader
                      label="หัวข้อกิจกรรม"
                      field="title"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <th className="p-3 text-xs font-bold text-[#5A4D41]">ภาคเรียน</th>
                    <th className="p-3 text-xs font-bold text-[#5A4D41]">สรุปการเข้าร่วม</th>
                    <SortableTableHeader
                      label="อัตราเข้าเรียน"
                      field="attendanceRate"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <th className="p-3 pr-5 text-xs font-bold text-[#5A4D41] text-right">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2E8DC] text-xs">
                  {paginatedSessions.map((s) => {
                    const formattedDate = new Date(s.date).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });

                    return (
                      <tr key={s.id} className="hover:bg-[#FAF6F0]/50 transition-colors">
                        <td className="p-3 pl-5 font-semibold text-[#3F342B]">
                          {formattedDate}
                        </td>
                        <td className="p-3">
                          <Link
                            href={`/admin/attendance/${s.id}`}
                            className="font-bold text-[#3F342B] hover:text-[#B94E48] transition-colors line-clamp-1"
                          >
                            {s.title}
                          </Link>
                          {s.note && (
                            <span className="text-[11px] text-[#7A6A5C] line-clamp-1 mt-0.5">
                              {s.note}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-[#FAF0E1] text-[#8C5D23] font-semibold text-[11px] border border-[#EADBCC]">
                            {s.academicTerm}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-emerald-700 font-semibold">
                              มา: {s.presentCount}
                            </span>
                            <span className="text-amber-700 font-semibold">
                              สาย: {s.lateCount}
                            </span>
                            <span className="text-sky-700 font-semibold">
                              ลา: {s.leaveCount}
                            </span>
                            <span className="text-red-700 font-semibold">
                              ขาด: {s.absentCount}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#3F342B]">
                              {s.attendanceRate}%
                            </span>
                            <div className="w-16 h-2 rounded-full bg-[#EADBCC] overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${s.attendanceRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/admin/attendance/${s.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs bg-[#FAF0E1] text-[#8C5D23] hover:bg-[#D9A441] hover:text-white transition-all shadow-2xs"
                            >
                              <span>เช็กชื่อ / แก้ไข</span>
                            </Link>

                            <a
                              href={`/api/export/attendance?sessionId=${s.id}`}
                              download
                              title="ส่งออกผลการเช็กชื่อรอบนี้เป็น CSV"
                              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDelete(s.id, s.title)}
                              className="p-1.5 rounded-lg text-[#7A6A5C] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="ลบรอบเช็กชื่อ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={sorted.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 10, 20]}
            />
          </div>
        </div>
      )}

      {/* Printable Attendance Summary Modal */}
      <PdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="แบบรายงานสรุปเวลาเรียนกิจกรรมพัฒนาผู้เรียน (กิจกรรมชุมนุม)"
        filename="แบบรายงานสรุปเวลาเรียนกิจกรรมชุมนุม_ทั้งหมด"
        orientation="portrait"
        pdfApiUrl="/api/export/attendance/render?className=ALL"
      />
    </div>
  );
}
