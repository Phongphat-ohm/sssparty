"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Users,
  CheckCheck,
  Search,
  Save,
  Loader2,
  ChevronLeft,
  CheckCircle2,
  Clock,
  UserX,
  AlertCircle,
  FileText,
  Table,
  LayoutGrid,
  FileSpreadsheet,
  KeyRound,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import {
  AttendanceStatusType,
  updateAttendanceBatchAction,
  markAllAttendanceStatusAction,
} from "@/actions/attendance";
import { TablePagination } from "@/components/ui/TablePagination";
import { SortableTableHeader, SortOrder } from "@/components/ui/SortableTableHeader";
import { showCozySuccess, showCozyError, showCozyConfirm } from "@/lib/ui/swal";
import { DynamicKeyProjectorModal } from "@/components/admin/attendance/DynamicKeyProjectorModal";
import { AttendanceLocationAuditTab } from "@/components/admin/attendance/AttendanceLocationAuditTab";

export interface StudentAttendanceRow {
  studentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  className: string;
  studentNumber: number;
  status: AttendanceStatusType;
  note?: string | null;
  checkInMethod?: string | null;
  checkedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  distanceFromSession?: number | null;
  hasLocation?: boolean;
  ipAddress?: string | null;
}

interface AttendanceSheetClientProps {
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  academicTerm: string;
  sessionNote?: string | null;
  isKeyActive?: boolean;
  keySecret?: string | null;
  centerCoords?: { latitude: number; longitude: number; expectedRadius?: number } | null;
  initialRecords: StudentAttendanceRow[];
  classList: string[];
}

export function AttendanceSheetClient({
  sessionId,
  sessionTitle,
  sessionDate,
  academicTerm,
  sessionNote,
  isKeyActive = false,
  keySecret = null,
  centerCoords = null,
  initialRecords,
  classList,
}: AttendanceSheetClientProps) {
  const router = useRouter();

  // Records state (map studentId -> { status, note })
  const [records, setRecords] = useState<StudentAttendanceRow[]>(initialRecords);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Dynamic Key Projector & Audit Tab
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<"SHEET" | "AUDIT">("SHEET");
  const [currentIsKeyActive, setCurrentIsKeyActive] = useState<boolean>(isKeyActive);
  const [currentKeySecret, setCurrentKeySecret] = useState<string | null>(keySecret);

  // ซิงก์สถานะ Key เมื่อ Server Component refresh
  useEffect(() => {
    setCurrentIsKeyActive(isKeyActive);
    setCurrentKeySecret(keySecret);
  }, [isKeyActive, keySecret]);

  // ซิงก์ข้อมูล records เมื่อ initialRecords เปลี่ยนแปลง
  useEffect(() => {
    if (!hasChanges) {
      setRecords(initialRecords);
    }
  }, [initialRecords, hasChanges]);

  // จัดการเมื่อมีนักเรียนเช็กชื่อเข้ามาแบบ Real-Time จากจอโปรเจกเตอร์
  const handleRealTimeCheckIn = useCallback((event?: any) => {
    if (event?.studentId) {
      setRecords((prev) =>
        prev.map((r) =>
          r.studentId === event.studentId
            ? {
                ...r,
                status: "PRESENT",
                checkInMethod: event.checkInMethod || "DYNAMIC_KEY",
                checkedAt: event.checkedAt || new Date().toISOString(),
                latitude: event.latitude ?? r.latitude,
                longitude: event.longitude ?? r.longitude,
                locationAccuracy: event.locationAccuracy ?? r.locationAccuracy,
                distanceFromSession: event.distanceFromSession ?? r.distanceFromSession,
                hasLocation: event.hasLocation !== undefined ? !!event.hasLocation : r.hasLocation,
              }
            : r
        )
      );
    }
    router.refresh();
  }, [router]);

  // ระบบ Real-Time Polling Sync เบื้องหลังสำหรับหน้านี้โดยเฉพาะ
  useEffect(() => {
    if (hasChanges) return; // หากครูกำลังแก้ไขตารางด้วยมือ จะไม่ทับข้อมูลชั่วคราว
    const syncWithServer = async () => {
      try {
        const res = await fetch(`/api/attendance/live?sessionId=${sessionId}&format=json`);
        if (res.ok) {
          const data = await res.json();
          if (data.isKeyActive !== undefined) {
            setCurrentIsKeyActive(data.isKeyActive);
            if (!data.isKeyActive) {
              setCurrentKeySecret(null);
            } else if (data.keySecret) {
              setCurrentKeySecret(data.keySecret);
            }
          }
          if (data.allRecords && data.allRecords.length > 0) {
            const recordMap = new Map(data.allRecords.map((ar: any) => [ar.studentId, ar]));
            setRecords((prev) => {
              let changed = false;
              const next = prev.map((r) => {
                const liveRec: any = recordMap.get(r.studentId);
                if (!liveRec) return r;
                if (liveRec.status !== r.status || liveRec.checkInMethod !== r.checkInMethod) {
                  changed = true;
                  return {
                    ...r,
                    status: liveRec.status,
                    checkInMethod: liveRec.checkInMethod,
                    checkedAt: liveRec.checkedAt,
                    latitude: liveRec.latitude,
                    longitude: liveRec.longitude,
                    locationAccuracy: liveRec.locationAccuracy,
                    distanceFromSession: liveRec.distanceFromSession,
                    hasLocation: liveRec.hasLocation,
                  };
                }
                return r;
              });
              return changed ? next : prev;
            });
          }
        }
      } catch {
        // ignore fetch error
      }
    };

    const interval = setInterval(syncWithServer, 3500);
    return () => clearInterval(interval);
  }, [sessionId, hasChanges]);

  // Filters & Search
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  // View Mode: "table" | "card"
  const [viewMode, setViewMode] = useState<"table" | "card">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("attendance_view_mode");
      if (saved === "card" || saved === "table") return saved;
    }
    return "table";
  });

  // Sort & Pagination
  const [sortField, setSortField] = useState<string>("studentNumber");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const formattedDate = new Date(sessionDate).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Calculate live stats
  const totalCount = records.length;
  const presentCount = records.filter((r) => r.status === "PRESENT").length;
  const lateCount = records.filter((r) => r.status === "LATE").length;
  const leaveCount = records.filter((r) => r.status === "LEAVE").length;
  const absentCount = records.filter((r) => r.status === "ABSENT").length;
  const attendanceRate =
    totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0;

  // Change individual student status
  const handleStatusChange = (studentId: string, newStatus: AttendanceStatusType) => {
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status: newStatus } : r))
    );
    setHasChanges(true);
  };

  // Change individual student note
  const handleNoteChange = (studentId: string, noteText: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, note: noteText } : r))
    );
    setHasChanges(true);
  };

  // Mark all present
  const handleMarkAllPresent = async () => {
    const confirmed = await showCozyConfirm(
      "เช็กมาครบทุกคน?",
      "ระบบจะปรับสถานะของนักเรียนทุกคนในรอบนี้เป็น 'มาเรียน' ทั้งหมด"
    );
    if (!confirmed.isConfirmed) return;

    setIsMarkingAll(true);
    try {
      const res = await markAllAttendanceStatusAction(sessionId, "PRESENT");
      if (res.success) {
        setRecords((prev) => prev.map((r) => ({ ...r, status: "PRESENT" })));
        setHasChanges(false);
        await showCozySuccess("สำเร็จ!", res.message);
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Save all changes
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const payload = records.map((r) => ({
        studentId: r.studentId,
        status: r.status,
        note: r.note || undefined,
      }));

      const res = await updateAttendanceBatchAction(sessionId, payload);
      if (res.success) {
        setHasChanges(false);
        await showCozySuccess("บันทึกสำเร็จ!", res.message);
        router.refresh();
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === "asc") setSortOrder("desc");
      else if (sortOrder === "desc") {
        setSortField("studentNumber");
        setSortOrder("asc");
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Filter & sort records
  const filtered = records.filter((r) => {
    const matchClass = selectedClass === "ALL" || r.className === selectedClass;
    const matchStatus = selectedStatus === "ALL" || r.status === selectedStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.studentCode.toLowerCase().includes(q) ||
      r.studentNumber.toString() === q;
    return matchClass && matchStatus && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortField || !sortOrder) return 0;
    let valA: any = (a as any)[sortField];
    let valB: any = (b as any)[sortField];

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-5 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/attendance"
            className="inline-flex items-center gap-1 text-xs text-[#7A6A5C] hover:text-[#B94E48] font-semibold mb-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>กลับไปหน้ารวมรอบเช็กชื่อ</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[#3F342B] tracking-tight">
            {sessionTitle}
          </h1>
          <p className="text-xs text-[#7A6A5C] flex flex-wrap items-center gap-2 mt-0.5 font-medium">
            <span>📅 {formattedDate}</span>
            <span>•</span>
            <span>ภาคเรียน {academicTerm}</span>
            {sessionNote && (
              <>
                <span>•</span>
                <span className="italic">{sessionNote}</span>
              </>
            )}
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setIsProjectorOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border active:scale-95 transition-all shadow-2xs cursor-pointer ${
              currentIsKeyActive
                ? "text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border-emerald-300 ring-2 ring-emerald-400/40"
                : "text-amber-900 bg-amber-100 hover:bg-amber-200 border-amber-300"
            }`}
          >
            <KeyRound className={`w-4 h-4 ${currentIsKeyActive ? "text-emerald-700" : "text-amber-700"}`} />
            <span>เปิดจอ Dynamic Key (30s)</span>
            {currentIsKeyActive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-200/80 px-1.5 py-0.5 rounded-full ml-0.5 animate-pulse">
                กำลังเปิดรับ
              </span>
            )}
          </button>

          <a
            href={`/api/export/attendance?sessionId=${sessionId}&className=${selectedClass}`}
            download
            title="ส่งออกผลการเช็กชื่อของคาบนี้เป็นไฟล์ Excel/CSV"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-600 hover:text-white active:scale-95 transition-all shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </a>

          <button
            type="button"
            onClick={handleMarkAllPresent}
            disabled={isMarkingAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#065F46] bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-2xs"
          >
            {isMarkingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4 text-emerald-600" />
            )}
            <span>เช็กมาครบทุกคน</span>
          </button>
        </div>
      </div>

      {/* Live Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-[#EADBCC] shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center font-bold text-sm">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-[#7A6A5C] block">สมาชิกทั้งหมด</span>
            <strong className="text-base font-bold text-[#3F342B]">{totalCount} คน</strong>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-emerald-100 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-700 block">มาเรียน</span>
            <strong className="text-base font-bold text-emerald-700">{presentCount} คน</strong>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-amber-100 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-amber-700 block">มาสาย</span>
            <strong className="text-base font-bold text-amber-700">{lateCount} คน</strong>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-sky-100 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-sm">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-sky-700 block">ลา</span>
            <strong className="text-base font-bold text-sky-700">{leaveCount} คน</strong>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-red-100 shadow-2xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
            <UserX className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-red-700 block">ขาดเรียน</span>
            <strong className="text-base font-bold text-red-700">{absentCount} คน</strong>
          </div>
        </div>
      </div>

      {/* Main Tab Switcher: Sheet View vs Location Audit */}
      <div className="flex items-center gap-2 border-b border-[#EBE3D5] pb-2">
        <button
          type="button"
          onClick={() => setActiveMainTab("SHEET")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === "SHEET"
              ? "bg-[#5C4A3A] text-white shadow-xs"
              : "bg-white text-[#7A6A5C] hover:text-[#3F342B] border border-[#EBE3D5]"
          }`}
        >
          📋 ตารางบันทึกการเช็กชื่อ
        </button>
        <button
          type="button"
          onClick={() => setActiveMainTab("AUDIT")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeMainTab === "AUDIT"
              ? "bg-[#5C4A3A] text-white shadow-xs"
              : "bg-white text-[#7A6A5C] hover:text-[#3F342B] border border-[#EBE3D5]"
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-amber-600" />
          <span>
            ตรวจสอบพิกัด & Audit ({records.filter((r) => r.hasLocation).length} คน)
          </span>
        </button>
      </div>

      {activeMainTab === "AUDIT" ? (
        <AttendanceLocationAuditTab
          sessionId={sessionId}
          records={records.map((r) => ({
            ...r,
            hasLocation: !!r.hasLocation,
          }))}
          centerCoords={centerCoords}
          onUpdateStatus={(studentId, newStatus) => {
            handleStatusChange(studentId, newStatus);
          }}
        />
      ) : (
        <>
          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Class Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedClass("ALL");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedClass === "ALL"
                  ? "bg-[#D9A441] text-white shadow-2xs"
                  : "bg-[#FAF6F0] text-[#7A6A5C] hover:bg-[#FAF0E1]"
              }`}
            >
              ทุกห้อง ({records.length})
            </button>

            {classList.map((cls) => {
              const count = records.filter((r) => r.className === cls).length;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => {
                    setSelectedClass(cls);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedClass === cls
                      ? "bg-[#D9A441] text-white shadow-2xs"
                      : "bg-[#FAF6F0] text-[#7A6A5C] hover:bg-[#FAF0E1]"
                  }`}
                >
                  ห้อง {cls} ({count})
                </button>
              );
            })}
          </div>

          {/* Right Controls: View Switcher + Search Box */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#FAF6F0] p-1 rounded-xl border border-[#D9CABB] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setViewMode("table");
                  if (typeof window !== "undefined") localStorage.setItem("attendance_view_mode", "table");
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-[#3F342B] shadow-2xs border border-[#EADBCC]"
                    : "text-[#7A6A5C] hover:text-[#3F342B]"
                }`}
                title="แสดงผลแบบตาราง"
              >
                <Table className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>แบบตาราง</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode("card");
                  if (typeof window !== "undefined") localStorage.setItem("attendance_view_mode", "card");
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "card"
                    ? "bg-white text-[#3F342B] shadow-2xs border border-[#EADBCC]"
                    : "text-[#7A6A5C] hover:text-[#3F342B]"
                }`}
                title="แสดงผลแบบการ์ด"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>แบบการ์ด</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-[#A8988B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ค้นหาชื่อ, รหัส, เลขที่..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#F2E8DC]">
          <span className="text-[11px] font-semibold text-[#7A6A5C] mr-1">กรองสถานะ:</span>
          {[
            { key: "ALL", label: "ทั้งหมด", color: "text-[#5A4D41]" },
            { key: "PRESENT", label: `มา (${presentCount})`, color: "text-emerald-700" },
            { key: "LATE", label: `สาย (${lateCount})`, color: "text-amber-700" },
            { key: "LEAVE", label: `ลา (${leaveCount})`, color: "text-sky-700" },
            { key: "ABSENT", label: `ขาด (${absentCount})`, color: "text-red-700" },
          ].map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => {
                setSelectedStatus(st.key);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedStatus === st.key
                  ? "bg-[#3F342B] text-white"
                  : "bg-[#FAF6F0] text-[#7A6A5C] hover:bg-[#FAF0E1]"
              }`}
            >
              <span className={selectedStatus === st.key ? "text-white" : st.color}>
                {st.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Sheet: Table or Cards based on viewMode */}
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs overflow-hidden">
        {viewMode === "table" ? (
          /* Table View (Full table with horizontal scrolling support on all devices) */
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#FAF6F0] border-b border-[#EADBCC]">
                <tr>
                  <SortableTableHeader
                    label="เลขที่"
                    field="studentNumber"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                    className="pl-5 w-20"
                  />
                  <SortableTableHeader
                    label="รหัสนักเรียน"
                    field="studentCode"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                    className="w-28"
                  />
                  <SortableTableHeader
                    label="ชื่อ - นามสกุล"
                    field="firstName"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label="ห้อง"
                    field="className"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                    className="w-24"
                  />
                  <th className="p-3 text-xs font-bold text-[#5A4D41] text-center w-72">
                    สถานะการเข้าเรียน
                  </th>
                  <th className="p-3 pr-5 text-xs font-bold text-[#5A4D41]">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2E8DC] text-xs">
                {paginated.map((r) => (
                  <tr key={r.studentId} className="hover:bg-[#FAF6F0]/40 transition-colors">
                    <td className="p-3 pl-5 font-bold text-[#3F342B]">
                      #{r.studentNumber}
                    </td>
                    <td className="p-3 text-[#5A4D41] font-mono">{r.studentCode}</td>
                    <td className="p-3 font-semibold text-[#3F342B]">
                      {r.firstName} {r.lastName}
                    </td>
                    <td className="p-3 text-[#5A4D41]">{r.className}</td>
                    <td className="p-3 text-center">
                      {/* Touch Pills Group */}
                      <div className="inline-flex rounded-xl bg-[#FAF6F0] p-1 border border-[#EADBCC] gap-1">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.studentId, "PRESENT")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            r.status === "PRESENT"
                              ? "bg-emerald-600 text-white shadow-xs scale-102"
                              : "text-[#7A6A5C] hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                        >
                          มา
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.studentId, "LATE")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            r.status === "LATE"
                              ? "bg-amber-500 text-white shadow-xs scale-102"
                              : "text-[#7A6A5C] hover:bg-amber-50 hover:text-amber-700"
                          }`}
                        >
                          สาย
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.studentId, "LEAVE")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            r.status === "LEAVE"
                              ? "bg-sky-600 text-white shadow-xs scale-102"
                              : "text-[#7A6A5C] hover:bg-sky-50 hover:text-sky-700"
                          }`}
                        >
                          ลา
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.studentId, "ABSENT")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            r.status === "ABSENT"
                              ? "bg-red-600 text-white shadow-xs scale-102"
                              : "text-[#7A6A5C] hover:bg-red-50 hover:text-red-700"
                          }`}
                        >
                          ขาด
                        </button>
                      </div>
                    </td>
                    <td className="p-3 pr-5">
                      <input
                        type="text"
                        value={r.note || ""}
                        onChange={(e) => handleNoteChange(r.studentId, e.target.value)}
                        placeholder="บันทึกหมายเหตุ..."
                        className="w-full px-2.5 py-1 rounded-lg border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-1 focus:ring-[#D9A441]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Cards View (Grid of cards for all devices) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 p-4 sm:p-5 bg-[#FAF6F0]/20">
            {paginated.map((r) => (
              <div
                key={r.studentId}
                className="bg-white p-4 rounded-2xl border border-[#EADBCC] shadow-2xs space-y-3 hover:border-[#D9A441] transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF0E1] text-[#8C5D23] font-bold text-xs flex items-center justify-center border border-[#EADBCC] shrink-0">
                      #{r.studentNumber}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-xs sm:text-sm text-[#3F342B] truncate">
                        {r.firstName} {r.lastName}
                      </h3>
                      <p className="text-[10px] text-[#7A6A5C]">
                        ห้อง {r.className} • รหัส {r.studentCode}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator Badge on Card Top Right */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      r.status === "PRESENT"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : r.status === "LATE"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : r.status === "LEAVE"
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {r.status === "PRESENT"
                      ? "มาเรียน"
                      : r.status === "LATE"
                      ? "มาสาย"
                      : r.status === "LEAVE"
                      ? "ลา"
                      : "ขาดเรียน"}
                  </span>
                </div>

                {/* 4 Touch Status Buttons */}
                <div className="grid grid-cols-4 gap-1.5 bg-[#FAF6F0] p-1 rounded-xl border border-[#EADBCC]">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(r.studentId, "PRESENT")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      r.status === "PRESENT"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-[#7A6A5C] bg-white hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    มา
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(r.studentId, "LATE")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      r.status === "LATE"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-[#7A6A5C] bg-white hover:bg-amber-50 hover:text-amber-700"
                    }`}
                  >
                    สาย
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(r.studentId, "LEAVE")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      r.status === "LEAVE"
                        ? "bg-sky-600 text-white shadow-xs"
                        : "text-[#7A6A5C] bg-white hover:bg-sky-50 hover:text-sky-700"
                    }`}
                  >
                    ลา
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(r.studentId, "ABSENT")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      r.status === "ABSENT"
                        ? "bg-red-600 text-white shadow-xs"
                        : "text-[#7A6A5C] bg-white hover:bg-red-50 hover:text-red-700"
                    }`}
                  >
                    ขาด
                  </button>
                </div>

                {/* Note field on card */}
                <input
                  type="text"
                  value={r.note || ""}
                  onChange={(e) => handleNoteChange(r.studentId, e.target.value)}
                  placeholder="ระบุหมายเหตุ เช่น ลาป่วย (ถ้ามี)..."
                  className="w-full px-3 py-1.5 rounded-lg border border-[#D9CABB] bg-[#FAF6F0] text-[11px] text-[#3F342B] focus:outline-none focus:ring-1 focus:ring-[#D9A441]"
                />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={sorted.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 15, 30, 50]}
        />
      </div>
      </>
      )}

      {/* Floating Bottom Sticky Save Bar (แสดงเฉพาะใน Sheet view) */}
      {activeMainTab === "SHEET" && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#EADBCC] p-3 sm:px-8 shadow-2xl">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {hasChanges ? (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  มีการแก้ไขที่ยังไม่ได้บันทึก
                </span>
              ) : (
                <span className="text-xs text-[#7A6A5C] hidden sm:inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ข้อมูลตรงกับในระบบเรียบร้อย
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[#B94E48] hover:bg-[#A33F39] active:scale-95 disabled:opacity-50 transition-all shadow-md cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>บันทึกผลการเช็กชื่อ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Key Projector Modal */}
      <DynamicKeyProjectorModal
        isOpen={isProjectorOpen}
        onClose={() => {
          setIsProjectorOpen(false);
          router.refresh();
        }}
        sessionId={sessionId}
        sessionTitle={sessionTitle}
        academicTerm={academicTerm}
        totalStudents={records.length}
        initialIsActive={currentIsKeyActive}
        initialKeySecret={currentKeySecret}
        initialCenterCoords={centerCoords}
        onCheckInEvent={handleRealTimeCheckIn}
      />
    </div>
  );
}
