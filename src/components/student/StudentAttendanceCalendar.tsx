"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  UserX,
  AlertCircle,
  Award,
  Sparkles,
  Info,
  List,
  Flag,
  KeyRound,
} from "lucide-react";
import { TablePagination } from "@/components/ui/TablePagination";
import { SortableTableHeader, SortOrder } from "@/components/ui/SortableTableHeader";
import { getThaiHolidaysMap, ThaiHolidayInfo } from "@/lib/utils/holidays";

export interface StudentAttendanceItem {
  sessionId: string;
  sessionTitle: string;
  sessionDate: string; // ISO string
  academicTerm: string;
  sessionNote?: string | null;
  status: "PRESENT" | "LATE" | "LEAVE" | "ABSENT";
  recordNote?: string | null;
  checkedAt: string;
}

interface StudentAttendanceCalendarProps {
  records: StudentAttendanceItem[];
  studentName: string;
  studentCode: string;
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

export function StudentAttendanceCalendar({
  records,
  studentName,
  studentCode,
}: StudentAttendanceCalendarProps) {
  // Map records by YYYY-MM-DD
  const recordsByDate = new Map<string, StudentAttendanceItem>();
  records.forEach((r) => {
    const dateKey = new Date(r.sessionDate).toISOString().split("T")[0];
    recordsByDate.set(dateKey, r);
  });

  // Current viewed month state
  const initialDate = records.length > 0 ? new Date(records[0].sessionDate) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-11

  // Thai Holidays Map
  const holidaysMap = useMemo(() => getThaiHolidaysMap(currentYear), [currentYear]);

  // Selected date state
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    records.length > 0 ? new Date(records[0].sessionDate).toISOString().split("T")[0] : null
  );

  // View mode: 'calendar' or 'list'
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // List view state (Filter, Sort, Pagination)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<string>("sessionDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Overall statistics
  const totalSessions = records.length;
  const presentCount = records.filter((r) => r.status === "PRESENT").length;
  const lateCount = records.filter((r) => r.status === "LATE").length;
  const leaveCount = records.filter((r) => r.status === "LEAVE").length;
  const absentCount = records.filter((r) => r.status === "ABSENT").length;

  // Percentage attendance (Present + Late count as attended)
  const attendanceRate =
    totalSessions > 0
      ? Math.round(((presentCount + lateCount) / totalSessions) * 100)
      : 0;

  const isPassing = attendanceRate >= 80;

  // Navigation for months
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

  // Generate calendar days
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarDays: {
    dayNumber: number;
    dateKey: string;
    isCurrentMonth: boolean;
    record?: StudentAttendanceItem;
    holiday?: ThaiHolidayInfo;
  }[] = [];

  // Padding days from previous month
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

  // Days in current month
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    calendarDays.push({
      dayNumber: d,
      dateKey: key,
      isCurrentMonth: true,
      record: recordsByDate.get(key),
      holiday: holidaysMap[key],
    });
  }

  // Padding days to fill 35 or 42 cells
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

  const selectedRecord = selectedDateKey ? recordsByDate.get(selectedDateKey) : null;
  const selectedHoliday = selectedDateKey ? holidaysMap[selectedDateKey] : null;

  // List view filtering and sorting
  const filteredList = records.filter((r) => {
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      r.sessionTitle.toLowerCase().includes(q) ||
      (r.recordNote && r.recordNote.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  const sortedList = [...filteredList].sort((a, b) => {
    if (!sortField || !sortOrder) return 0;
    let valA: any = (a as any)[sortField];
    let valB: any = (b as any)[sortField];

    if (sortField === "sessionDate") {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedList.length / pageSize) || 1;
  const paginatedList = sortedList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === "asc") setSortOrder("desc");
      else if (sortOrder === "desc") {
        setSortField("sessionDate");
        setSortOrder("desc");
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* 1. Header Banner & Attendance Percentage Card */}
      <div className="bg-gradient-to-r from-[#D9A441] via-[#C96B4B] to-[#B94E48] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-52 h-52 bg-white/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>ประวัติการเข้าร่วมกิจกรรมชุมนุม</span>
              </div>
              <Link
                href="/student/checkin"
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-white text-[#5C4A3A] hover:bg-amber-50 px-3 py-1 rounded-full shadow-xs active:scale-95 transition-all"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span>เข้าห้องเช็กชื่อสด</span>
              </Link>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              สถิติการเช็กชื่อของ {studentName}
            </h1>
            <p className="text-xs sm:text-sm text-white/90">
              รหัสนักเรียน <strong>{studentCode}</strong> • ชุมนุมสื่อสร้างสรรค์
            </p>
          </div>

          {/* Progress & Pass/Fail Indicator */}
          <div className="bg-white/15 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/25 flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <div className="text-center sm:text-left">
              <span className="text-[11px] text-white/80 block">อัตราการเข้าเรียนสะสม</span>
              <div className="flex items-baseline gap-1 justify-center sm:justify-start">
                <strong className="text-3xl font-black text-amber-200">{attendanceRate}%</strong>
                <span className="text-xs text-white/80">/ 100%</span>
              </div>
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-white/25 pt-2 sm:pt-0 sm:pl-4 text-center sm:text-left">
              {isPassing ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/30 px-3 py-1 rounded-xl border border-emerald-400/30">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>ผ่านเกณฑ์กิจกรรม (≥ 80%)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200 bg-amber-950/30 px-3 py-1 rounded-xl border border-amber-400/30">
                  <AlertCircle className="w-4 h-4 text-amber-200" />
                  <span>ยังไม่ถึงเกณฑ์ (เป้าหมาย 80%)</span>
                </div>
              )}
              <span className="text-[10px] text-white/75 mt-1 block">
                เช็กชื่อแล้ว {totalSessions} ครั้ง
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-emerald-700 block">มาเรียนตรงเวลา</span>
            <strong className="text-lg font-bold text-emerald-700">{presentCount} ครั้ง</strong>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-amber-100 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-amber-700 block">มาสาย</span>
            <strong className="text-lg font-bold text-amber-700">{lateCount} ครั้ง</strong>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-sky-100 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-sm">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-sky-700 block">มีใบลา / ลา</span>
            <strong className="text-lg font-bold text-sky-700">{leaveCount} ครั้ง</strong>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-red-100 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
            <UserX className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-red-700 block">ขาดเรียน</span>
            <strong className="text-lg font-bold text-red-700">{absentCount} ครั้ง</strong>
          </div>
        </div>
      </div>

      {/* 3. View Mode Toggle (Calendar vs List) */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-[#EADBCC] shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === "calendar"
                ? "bg-[#D9A441] text-white shadow-2xs"
                : "text-[#7A6A5C] hover:text-[#3F342B]"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>ปฏิทินการเช็กชื่อ (Calendar View)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-[#D9A441] text-white shadow-2xs"
                : "text-[#7A6A5C] hover:text-[#3F342B]"
            }`}
          >
            <List className="w-4 h-4" />
            <span>รายการประวัติทั้งหมด ({records.length})</span>
          </button>
        </div>

        <span className="hidden sm:inline-block text-[11px] text-[#7A6A5C] px-3">
          คลิกวันที่ในปฏิทินเพื่อดูรายละเอียดกิจกรรมและวันหยุด
        </span>
      </div>

      {/* 4. Calendar View */}
      {viewMode === "calendar" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Calendar Grid Box */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-[#EADBCC] shadow-xs p-5 space-y-4">
            {/* Calendar Month Navigation Header */}
            <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center font-bold">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-[#3F342B]">
                    {THAI_MONTHS[currentMonth]} {currentYear + 543}
                  </h2>
                  <span className="text-[11px] text-[#7A6A5C]">
                    แสดงผลการเข้าเรียนและวันหยุดราชการภาษาไทย (🚩)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl border border-[#EADBCC] text-[#5A4D41] hover:bg-[#FAF6F0] transition-colors cursor-pointer"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl border border-[#EADBCC] text-[#5A4D41] hover:bg-[#FAF6F0] transition-colors cursor-pointer"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 text-center text-xs font-bold text-[#7A6A5C]">
              {WEEKDAYS.map((day, idx) => (
                <div
                  key={day}
                  className={`py-1.5 ${idx === 0 ? "text-red-500" : ""}`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((cd, idx) => {
                const hasRecord = !!cd.record;
                const isSelected = selectedDateKey === cd.dateKey;
                const isHoliday = !!cd.holiday;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (cd.isCurrentMonth || hasRecord) {
                        setSelectedDateKey(cd.dateKey);
                      }
                    }}
                    className={`min-h-[58px] sm:min-h-[68px] p-1.5 rounded-2xl flex flex-col items-center justify-between transition-all cursor-pointer border ${
                      !cd.isCurrentMonth
                        ? "opacity-25 border-transparent cursor-default"
                        : isSelected
                        ? "border-[#D9A441] bg-[#FFF9F0] shadow-xs scale-102 ring-2 ring-[#D9A441]/30"
                        : hasRecord
                        ? "border-[#EADBCC] bg-[#FAF6F0]/60 hover:bg-[#FFF9F0]"
                        : isHoliday
                        ? "border-rose-200 bg-rose-50/40 hover:bg-rose-50"
                        : "border-transparent hover:bg-[#FAF6F0]/40"
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          isSelected
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

                      {isHoliday && (
                        <span className="text-[9px] text-rose-600" title={cd.holiday?.name}>
                          🚩
                        </span>
                      )}
                    </div>

                    {/* Status indicator on date */}
                    {cd.record ? (
                      <div className="w-full flex flex-col items-center gap-0.5 mt-0.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            cd.record.status === "PRESENT"
                              ? "bg-emerald-500"
                              : cd.record.status === "LATE"
                              ? "bg-amber-500"
                              : cd.record.status === "LEAVE"
                              ? "bg-sky-500"
                              : "bg-red-500"
                          }`}
                        />
                        <span
                          className={`text-[9px] font-bold px-1 rounded-sm leading-tight hidden sm:block ${
                            cd.record.status === "PRESENT"
                              ? "text-emerald-700 bg-emerald-50"
                              : cd.record.status === "LATE"
                              ? "text-amber-700 bg-amber-50"
                              : cd.record.status === "LEAVE"
                              ? "text-sky-700 bg-sky-50"
                              : "text-red-700 bg-red-50"
                          }`}
                        >
                          {cd.record.status === "PRESENT"
                            ? "มา"
                            : cd.record.status === "LATE"
                            ? "สาย"
                            : cd.record.status === "LEAVE"
                            ? "ลา"
                            : "ขาด"}
                        </span>
                      </div>
                    ) : isHoliday ? (
                      <span className="text-[8px] text-rose-700 truncate w-full block text-center leading-tight hidden sm:block">
                        {cd.holiday?.name}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-3 border-t border-[#F2E8DC] text-[11px] text-[#7A6A5C]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>มาเรียน</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>มาสาย</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span>ลา</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>ขาดเรียน</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span>🚩</span>
                <span className="text-rose-700 font-semibold">วันหยุดราชการ</span>
              </span>
            </div>
          </div>

          {/* Selected Date Detail Card */}
          <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#D9A441]" />
                  <h3 className="font-bold text-sm text-[#3F342B]">
                    รายละเอียดวันที่เลือก
                  </h3>
                </div>

                {selectedDateKey && (
                  <span className="text-xs font-semibold text-[#7A6A5C] bg-[#FAF6F0] px-2.5 py-1 rounded-lg">
                    {new Date(selectedDateKey).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>

              {/* Holiday Banner if selected date is a holiday */}
              {selectedHoliday && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5 font-medium animate-in fade-in">
                  <span className="text-lg">🚩</span>
                  <div>
                    <span className="font-bold block text-rose-900">{selectedHoliday.name}</span>
                    <span className="text-[10px] text-rose-600">วันหยุดราชการ / วันสำคัญ</span>
                  </div>
                </div>
              )}

              {selectedRecord ? (
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  <div>
                    <span className="text-[11px] text-[#7A6A5C] block">วันที่</span>
                    <strong className="text-sm font-bold text-[#3F342B]">
                      {new Date(selectedRecord.sessionDate).toLocaleDateString("th-TH", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#7A6A5C] block">หัวข้อกิจกรรม</span>
                    <p className="text-xs font-bold text-[#3F342B] mt-0.5">
                      {selectedRecord.sessionTitle}
                    </p>
                    {selectedRecord.sessionNote && (
                      <p className="text-[11px] text-[#7A6A5C] mt-0.5">
                        {selectedRecord.sessionNote}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] text-[#7A6A5C] block">สถานะการเช็กชื่อ</span>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                          selectedRecord.status === "PRESENT"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : selectedRecord.status === "LATE"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : selectedRecord.status === "LEAVE"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {selectedRecord.status === "PRESENT" && (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {selectedRecord.status === "LATE" && (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {selectedRecord.status === "LEAVE" && (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        {selectedRecord.status === "ABSENT" && (
                          <UserX className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {selectedRecord.status === "PRESENT"
                            ? "มาเรียนตรงเวลา"
                            : selectedRecord.status === "LATE"
                            ? "มาสาย"
                            : selectedRecord.status === "LEAVE"
                            ? "มีใบลา / ลา"
                            : "ขาดเรียน"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {selectedRecord.recordNote && (
                    <div className="bg-[#FAF6F0] p-3 rounded-xl border border-[#EADBCC]">
                      <span className="text-[10px] text-[#7A6A5C] font-semibold block">
                        หมายเหตุจากอาจารย์:
                      </span>
                      <p className="text-xs text-[#3F342B] mt-0.5">
                        {selectedRecord.recordNote}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] text-[#A8988B] block">
                      บันทึกเมื่อ:{" "}
                      {new Date(selectedRecord.checkedAt).toLocaleDateString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF6F0] text-[#A8988B] flex items-center justify-center mx-auto">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-[#5A4D41]">
                    ไม่มีการเช็กชื่อในวันที่เลือก
                  </p>
                  <p className="text-[11px] text-[#7A6A5C]">
                    คลิกวันที่ที่มีจุดสีในปฏิทินเพื่อดูประวัติการเข้าเรียน
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-[#FFF9F0] rounded-2xl border border-[#EADBCC] text-[11px] text-[#7A6A5C] leading-relaxed">
              💡 <strong>คำแนะนำ:</strong> ชุมนุมกำหนดให้สมาชิกต้องเข้าร่วมกิจกรรมไม่น้อยกว่า
              80% ของเวลาทั้งหมด เพื่อผ่านเกณฑ์การประเมินกิจกรรมพัฒนาผู้เรียน
            </div>
          </div>
        </div>
      )}

      {/* 5. List View (Table with Filter, Sort, Pagination) */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#EADBCC] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Status Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: "ALL", label: `ทั้งหมด (${records.length})` },
                { key: "PRESENT", label: `มา (${presentCount})` },
                { key: "LATE", label: `สาย (${lateCount})` },
                { key: "LEAVE", label: `ลา (${leaveCount})` },
                { key: "ABSENT", label: `ขาด (${absentCount})` },
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st.key);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === st.key
                      ? "bg-[#D9A441] text-white shadow-2xs"
                      : "bg-[#FAF6F0] text-[#7A6A5C] hover:bg-[#FAF0E1]"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="w-full sm:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ค้นหาหัวข้อกิจกรรม..."
                className="w-full px-3 py-1.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
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
                      label="วันที่"
                      field="sessionDate"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      className="pl-5 w-32"
                    />
                    <SortableTableHeader
                      label="หัวข้อกิจกรรม"
                      field="sessionTitle"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <th className="p-3 text-xs font-bold text-[#5A4D41]">ภาคเรียน</th>
                    <SortableTableHeader
                      label="สถานะ"
                      field="status"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      className="w-36 text-center"
                    />
                    <th className="p-3 pr-5 text-xs font-bold text-[#5A4D41]">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2E8DC] text-xs">
                  {paginatedList.map((item) => (
                    <tr
                      key={item.sessionId}
                      className="hover:bg-[#FAF6F0]/50 transition-colors"
                    >
                      <td className="p-3 pl-5 font-semibold text-[#3F342B]">
                        {new Date(item.sessionDate).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-[#3F342B] block">
                          {item.sessionTitle}
                        </span>
                        {item.sessionNote && (
                          <span className="text-[11px] text-[#7A6A5C]">
                            {item.sessionNote}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-[#5A4D41]">
                        <span className="px-2 py-0.5 rounded-md bg-[#FAF0E1] text-[#8C5D23] font-semibold text-[11px]">
                          {item.academicTerm}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                            item.status === "PRESENT"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : item.status === "LATE"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : item.status === "LEAVE"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {item.status === "PRESENT"
                            ? "มาเรียน"
                            : item.status === "LATE"
                            ? "มาสาย"
                            : item.status === "LEAVE"
                            ? "ลา"
                            : "ขาดเรียน"}
                        </span>
                      </td>
                      <td className="p-3 pr-5 text-[#7A6A5C]">
                        {item.recordNote || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={sortedList.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 10, 20]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
