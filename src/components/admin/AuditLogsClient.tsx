"use client";

import { useState, useTransition } from "react";
import {
  History,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  FileText,
  User,
  Laptop,
  RefreshCw,
  Download,
  Copy,
  Check,
  Zap,
  Lock,
  Calendar,
  Layers,
} from "lucide-react";
import {
  AuditLogItem,
  AuditLogsResult,
  getAuditLogsAction,
  exportAuditLogsCsvAction,
  AuditCategory,
} from "@/actions/audit";
import { TablePagination } from "@/components/ui/TablePagination";
import { formatThaiDateTime } from "@/lib/utils/date-thai";

interface AuditLogsClientProps {
  initialData: AuditLogsResult;
}

export function AuditLogsClient({ initialData }: AuditLogsClientProps) {
  const [data, setData] = useState<AuditLogsResult>(initialData);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Filters state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [targetTypeFilter, setTargetTypeFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Selected Log for detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = (
    targetPage = page,
    targetPageSize = pageSize,
    overrideFilters?: { category?: string; action?: string; targetType?: string }
  ) => {
    startTransition(async () => {
      const res = await getAuditLogsAction({
        page: targetPage,
        pageSize: targetPageSize,
        category: overrideFilters?.category ?? categoryFilter,
        action: overrideFilters?.action ?? actionFilter,
        targetType: overrideFilters?.targetType ?? targetTypeFilter,
        search,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.success) {
        setData(res);
      }
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1, pageSize);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchLogs(newPage, pageSize);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    fetchLogs(1, newPageSize);
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const res = await exportAuditLogsCsvAction({
        category: categoryFilter,
        action: actionFilter,
        targetType: targetTypeFilter,
        search,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (!res.success || !res.csvData) {
        alert(res.message || "ไม่สามารถส่งออกข้อมูลประวัติการใช้งานได้");
        return;
      }

      const blob = new Blob([res.csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.filename || "audit-logs.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์ CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (iso: string) => {
    return formatThaiDateTime(iso, { variant: "withSeconds" });
  };

  const getActionBadge = (action: string) => {
    if (
      action.includes("FAILED") ||
      action.includes("UNAUTHORIZED") ||
      action.includes("BLOCKED")
    ) {
      return {
        label: action,
        color: "bg-red-50 text-red-700 border-red-200",
        icon: ShieldAlert,
      };
    }
    if (action.includes("SUCCESS")) {
      return {
        label: action,
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
      };
    }
    if (action.includes("LOGOUT")) {
      return {
        label: "LOGOUT",
        color: "bg-stone-100 text-stone-700 border-stone-200",
        icon: Clock,
      };
    }
    if (action.includes("CREATE") || action.includes("IMPORT")) {
      return {
        label: action,
        color: "bg-blue-50 text-blue-700 border-blue-200",
        icon: FileText,
      };
    }
    if (
      action.includes("UPDATE") ||
      action.includes("RESET") ||
      action.includes("GRADE") ||
      action.includes("TOGGLE")
    ) {
      return {
        label: action,
        color: "bg-amber-50 text-amber-700 border-amber-200",
        icon: RefreshCw,
      };
    }
    if (action.includes("DELETE")) {
      return {
        label: action,
        color: "bg-rose-50 text-rose-700 border-rose-200",
        icon: XCircle,
      };
    }
    if (action.includes("REPORT")) {
      return {
        label: action,
        color: "bg-purple-50 text-purple-700 border-purple-200",
        icon: ShieldCheck,
      };
    }

    return {
      label: action,
      color: "bg-stone-50 text-stone-700 border-stone-200",
      icon: Clock,
    };
  };

  // Helper to parse JSON details safely
  const parseDetails = (detailsStr: string | null) => {
    if (!detailsStr) return { raw: null, json: null };
    try {
      const parsed = JSON.parse(detailsStr);
      if (typeof parsed === "object" && parsed !== null) {
        return { raw: detailsStr, json: parsed };
      }
      return { raw: detailsStr, json: null };
    } catch {
      return { raw: detailsStr, json: null };
    }
  };

  const handleCopyJson = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const selectedDetails = selectedLog ? parseDetails(selectedLog.details) : { raw: null, json: null };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3F342B] tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-[#B94E48]" />
            บันทึกประวัติการใช้งาน (Audit Logs)
          </h1>
          <p className="text-xs sm:text-sm text-[#7A6A5C]">
            ศูนย์กลางตรวจจับความปลอดภัย เหตุการณ์เข้าสู่ระบบ และการดำเนินงานทั้งหมด (Single Point of Truth)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Export CSV button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting || isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#5A4D41] bg-white border border-[#D9CABB] hover:bg-[#FAF6F0] active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="ส่งออกประวัติการใช้งานตามเงื่อนไขที่เลือกเป็นไฟล์ CSV (UTF-8 BOM สำหรับ Excel)"
          >
            <Download className={`w-3.5 h-3.5 ${isExporting ? "animate-bounce text-[#B94E48]" : ""}`} />
            <span>{isExporting ? "กำลังส่งออก..." : "ดาวน์โหลด CSV"}</span>
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => fetchLogs()}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#5A4D41] bg-white border border-[#D9CABB] hover:bg-[#FAF6F0] active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin text-[#B94E48]" : ""}`} />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#EADBCC] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#7A6A5C] block">
            เหตุการณ์ทั้งหมด
          </span>
          <span className="text-xl sm:text-2xl font-black text-[#3F342B]">
            {data.stats.totalLogs.toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            เข้าสู่ระบบสำเร็จ
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700">
            {data.stats.loginSuccessCount.toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-red-100 shadow-2xs">
          <span className="text-[11px] font-semibold text-red-700 block flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            เข้าสู่ระบบล้มเหลว / ปฏิเสธ
          </span>
          <span className="text-xl sm:text-2xl font-black text-red-600">
            {data.stats.loginFailedCount.toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-100 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            กิจกรรมวันนี้
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-800">
            {data.stats.actionsTodayCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 3. Filters Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#EADBCC] shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#A8988B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาตามชื่อผู้ใช้, IP, รหัสเป้าหมาย, หรือรายละเอียดเชิงลึก..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#B94E48] hover:bg-[#A33F39] active:scale-95 transition-all shadow-2xs cursor-pointer shrink-0"
          >
            ค้นหา
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F2E8DC] text-xs">
          <div className="flex items-center gap-1 text-[#7A6A5C] font-semibold text-[11px]">
            <Filter className="w-3.5 h-3.5" />
            <span>กรองตาม:</span>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              const val = e.target.value;
              setCategoryFilter(val);
              setPage(1);
              fetchLogs(1, pageSize, { category: val });
            }}
            className="px-2.5 py-1.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs font-medium text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
          >
            <option value="ALL">ทุกหมวดหมู่เหตุการณ์</option>
            <option value="AUTH_SECURITY">🔐 ความปลอดภัยและเข้าสู่ระบบ (Security & Auth)</option>
            <option value="ATTENDANCE">📅 การเช็กชื่อเข้าเรียน (Attendance)</option>
            <option value="GRADING">📝 การตรวจงานและคะแนน (Grading)</option>
            <option value="USER_MGMT">👥 จัดการผู้ใช้และสิทธิ์ (Users & Permissions)</option>
            <option value="REPORTS_FILES">📄 รายงานราชการและไฟล์ (Reports & Files)</option>
            <option value="SYSTEM">⚙️ ระบบและการตั้งค่า (System & Config)</option>
          </select>

          {/* Target Type Filter */}
          <select
            value={targetTypeFilter}
            onChange={(e) => {
              const val = e.target.value;
              setTargetTypeFilter(val);
              setPage(1);
              fetchLogs(1, pageSize, { targetType: val });
            }}
            className="px-2.5 py-1.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
          >
            <option value="ALL">ทุกประเภทเป้าหมาย (Target)</option>
            <option value="AUTH">AUTH (การยืนยันตัวตน)</option>
            <option value="ASSIGNMENT">ASSIGNMENT (การบ้าน)</option>
            <option value="SUBMISSION">SUBMISSION (การส่งงาน)</option>
            <option value="STUDENT">STUDENT (ข้อมูลนักเรียน)</option>
            <option value="ATTENDANCE">ATTENDANCE (การเช็กชื่อ)</option>
            <option value="USER">USER (ผู้ใช้งาน)</option>
            <option value="REPORT">REPORT (รายงาน)</option>
            <option value="FILE">FILE (ไฟล์)</option>
            <option value="SYSTEM">SYSTEM (ระบบ)</option>
          </select>

          {/* Action Specific Filter */}
          <select
            value={actionFilter}
            onChange={(e) => {
              const val = e.target.value;
              setActionFilter(val);
              setPage(1);
              fetchLogs(1, pageSize, { action: val });
            }}
            className="px-2.5 py-1.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
          >
            <option value="ALL">การกระทำเฉพาะ (Action)</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="LOGIN_BLOCKED_MAINTENANCE">LOGIN_BLOCKED_MAINTENANCE</option>
            <option value="UNAUTHORIZED_ACCESS">UNAUTHORIZED_ACCESS</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="PASSWORD_CHANGE_SUCCESS">PASSWORD_CHANGE_SUCCESS</option>
            <option value="PASSWORD_CHANGE_FAILED">PASSWORD_CHANGE_FAILED</option>
            <option value="RESET_PASSWORD">RESET_PASSWORD</option>
            <option value="CREATE_ASSIGNMENT">CREATE_ASSIGNMENT</option>
            <option value="UPDATE_ASSIGNMENT">UPDATE_ASSIGNMENT</option>
            <option value="DELETE_ASSIGNMENT">DELETE_ASSIGNMENT</option>
            <option value="GRADE_SUBMISSION">GRADE_SUBMISSION</option>
            <option value="UPDATE_GRADE">UPDATE_GRADE</option>
            <option value="CREATE_STUDENT">CREATE_STUDENT</option>
            <option value="UPDATE_STUDENT">UPDATE_STUDENT</option>
            <option value="UPDATE_STUDENT_STATUS">UPDATE_STUDENT_STATUS</option>
            <option value="IMPORT_STUDENTS_CSV">IMPORT_STUDENTS_CSV</option>
            <option value="CREATE_ATTENDANCE_SESSION">CREATE_ATTENDANCE_SESSION</option>
            <option value="CHECK_IN_KEY_USED">CHECK_IN_KEY_USED</option>
            <option value="CHECK_IN_FAILED">CHECK_IN_FAILED</option>
            <option value="UPDATE_USER_PERMISSIONS">UPDATE_USER_PERMISSIONS</option>
            <option value="OFFICIAL_REPORT_GENERATED">OFFICIAL_REPORT_GENERATED</option>
            <option value="DELETE_OFFICIAL_REPORT">DELETE_OFFICIAL_REPORT</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategoryFilter("ALL");
              setActionFilter("ALL");
              setTargetTypeFilter("ALL");
              setStartDate("");
              setEndDate("");
              setPage(1);
              fetchLogs(1, pageSize, { category: "ALL", action: "ALL", targetType: "ALL" });
            }}
            className="text-[11px] text-[#7A6A5C] hover:text-[#B94E48] underline underline-offset-2 ml-auto cursor-pointer"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      </div>

      {/* 4. Logs Table */}
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#F2E8DC] flex items-center justify-between">
          <h2 className="font-bold text-[#3F342B] text-sm sm:text-base flex items-center gap-2">
            <span>รายการบันทึกประวัติ</span>
            <span className="text-xs font-normal text-[#7A6A5C]">
              (พบ {data.totalCount.toLocaleString()} รายการ)
            </span>
          </h2>
          {isPending && (
            <span className="text-xs text-[#B94E48] font-semibold animate-pulse flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              กำลังโหลดข้อมูล...
            </span>
          )}
        </div>

        {data.logs.length === 0 ? (
          <div className="p-12 text-center text-[#7A6A5C] text-xs sm:text-sm space-y-2">
            <History className="w-8 h-8 text-[#D9CABB] mx-auto opacity-70" />
            <p className="font-semibold text-[#5A4D41]">
              ไม่พบประวัติการใช้งานตามเงื่อนไขที่เลือก
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF6F0] border-b border-[#EADBCC] text-[#5A4D41] font-bold">
                    <th className="py-3 px-4">วันเวลา (Timestamp)</th>
                    <th className="py-3 px-4">ผู้ใช้งาน (User)</th>
                    <th className="py-3 px-4">การกระทำ (Action)</th>
                    <th className="py-3 px-4">เป้าหมาย (Target)</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4 text-right">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2E8DC]">
                  {data.logs.map((log) => {
                    const badge = getActionBadge(log.action);
                    const ActionIcon = badge.icon;

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-[#FFF9F0]/60 transition-colors cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        {/* Timestamp */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#7A6A5C] whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>

                        {/* User */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-[#FAF0E1] text-[#8C5D23] font-bold text-[10px] flex items-center justify-center shrink-0 border border-[#EADBCC]">
                              {log.username?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div className="overflow-hidden">
                              <span className="font-bold text-[#3F342B] block truncate max-w-[130px]">
                                {log.username || "ระบบ / ไม่ระบุ"}
                              </span>
                              {log.role && (
                                <span className="text-[9px] text-[#7A6A5C] font-semibold">
                                  {log.role === "ADMIN" ? "ผู้ดูแลระบบ" : "นักเรียน"}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}
                          >
                            <ActionIcon className="w-3 h-3" />
                            <span>{log.action}</span>
                          </span>
                        </td>

                        {/* Target */}
                        <td className="py-3.5 px-4">
                          {log.targetType ? (
                            <span className="text-[10px] font-bold text-[#5A4D41] bg-[#FAF0E1] px-2 py-0.5 rounded-md border border-[#EADBCC]">
                              {log.targetType}
                            </span>
                          ) : (
                            <span className="text-[#A8988B] text-[10px]">-</span>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#5A4D41]">
                          {log.ipAddress || "unknown"}
                        </td>

                        {/* Action details button */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="p-1.5 rounded-lg text-[#7A6A5C] hover:text-[#B94E48] hover:bg-[#FAF0E1] transition-colors cursor-pointer"
                            title="ดูรายละเอียดเชิงลึกและข้อมูล JSON"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <TablePagination
              currentPage={data.currentPage}
              totalPages={data.totalPages}
              pageSize={pageSize}
              totalItems={data.totalCount}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
        )}
      </div>

      {/* 5. Enhanced Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="p-5 border-b border-[#F2E8DC] flex items-center justify-between bg-[#FFF9F0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FAF0E1] text-[#B94E48] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#3F342B] text-base leading-tight">
                    รายละเอียด Audit Log
                  </h3>
                  <p className="text-[10px] text-[#7A6A5C] font-mono">
                    ID: {selectedLog.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-[#7A6A5C] hover:bg-[#FAF6F0] hover:text-[#3F342B] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Event Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-[#FAF6F0] rounded-2xl border border-[#EADBCC]">
                <div>
                  <span className="text-[10px] text-[#7A6A5C] block font-semibold">วันเวลา</span>
                  <span className="font-mono font-bold text-[#3F342B]">
                    {formatDate(selectedLog.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A6A5C] block font-semibold">Action</span>
                  <span className="font-bold text-[#B94E48] break-all">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A6A5C] block font-semibold">ผู้ใช้งาน (User)</span>
                  <span className="font-bold text-[#3F342B]">
                    {selectedLog.username || "ระบบ"} ({selectedLog.role || "N/A"})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A6A5C] block font-semibold">เป้าหมาย (Target)</span>
                  <span className="font-semibold text-[#3F342B]">
                    {selectedLog.targetType || "N/A"} {selectedLog.targetId ? `(#${selectedLog.targetId})` : ""}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-[#7A6A5C] block font-semibold">IP Address</span>
                  <span className="font-mono text-[#3F342B]">{selectedLog.ipAddress || "unknown"}</span>
                </div>
              </div>

              {/* User Agent */}
              <div className="space-y-1">
                <span className="font-bold text-[#5A4D41] flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5" />
                  User-Agent:
                </span>
                <p className="p-2.5 rounded-xl bg-stone-50 border border-[#EADBCC] font-mono text-[11px] text-[#5A4D41] break-all">
                  {selectedLog.userAgent || "unknown"}
                </p>
              </div>

              {/* Structured JSON Visuals (if available) */}
              {selectedDetails.json && (
                <div className="space-y-2 p-3 bg-white rounded-2xl border border-[#EADBCC]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#5A4D41] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      ข้อมูลประมวลผล (Structured Metrics)
                    </span>
                    {selectedDetails.json.durationMs !== undefined && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                        ⚡ {selectedDetails.json.durationMs} ms
                      </span>
                    )}
                  </div>

                  {/* Diff highlight card */}
                  {(selectedDetails.json.scoreDiff ||
                    selectedDetails.json.addedPermissions ||
                    selectedDetails.json.removedPermissions ||
                    selectedDetails.json.roleChanged ||
                    selectedDetails.json.statusChanged) && (
                    <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-1 text-[11px]">
                      <span className="font-bold text-amber-900 block">การเปลี่ยนแปลงข้อมูล (Diffs):</span>
                      {selectedDetails.json.scoreDiff && (
                        <p className="text-[#3F342B]">
                          • คะแนน:{" "}
                          <span className="line-through text-stone-400">
                            {selectedDetails.json.scoreDiff.from ?? "ยังไม่มี"}
                          </span>{" "}
                          →{" "}
                          <span className="font-bold text-emerald-700">
                            {selectedDetails.json.scoreDiff.to}
                          </span>
                        </p>
                      )}
                      {selectedDetails.json.roleChanged && (
                        <p className="text-[#3F342B]">
                          • เปลี่ยนบทบาท: {selectedDetails.json.roleChanged.from} →{" "}
                          <span className="font-bold text-[#B94E48]">
                            {selectedDetails.json.roleChanged.to}
                          </span>
                        </p>
                      )}
                      {selectedDetails.json.statusChanged && (
                        <p className="text-[#3F342B]">
                          • เปลี่ยนสถานะ: {selectedDetails.json.statusChanged.from} →{" "}
                          <span className="font-bold">{selectedDetails.json.statusChanged.to}</span>
                        </p>
                      )}
                      {selectedDetails.json.addedPermissions?.length > 0 && (
                        <p className="text-emerald-700">
                          • สิทธิ์ที่เพิ่มขึ้น (+):{" "}
                          {selectedDetails.json.addedPermissions.join(", ")}
                        </p>
                      )}
                      {selectedDetails.json.removedPermissions?.length > 0 && (
                        <p className="text-red-700">
                          • สิทธิ์ที่ถูกตัดออก (-):{" "}
                          {selectedDetails.json.removedPermissions.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Raw Details / JSON Inspector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#5A4D41] flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    รายละเอียดดิบ (Raw Payload):
                  </span>
                  {selectedLog.details && (
                    <button
                      type="button"
                      onClick={() => handleCopyJson(selectedLog.details || "")}
                      className="inline-flex items-center gap-1 text-[11px] text-[#7A6A5C] hover:text-[#B94E48] transition-colors cursor-pointer"
                    >
                      {copiedJson ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>คัดลอก JSON</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="p-3.5 rounded-2xl bg-[#2A2420] text-[#FAF6F0] font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-56 leading-relaxed border border-[#3F342B]">
                  {selectedDetails.json
                    ? JSON.stringify(selectedDetails.json, null, 2)
                    : selectedLog.details || "ไม่มีข้อมูลรายละเอียดเพิ่มเติม"}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#F2E8DC] bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#B94E48] hover:bg-[#A33F39] transition-all cursor-pointer shadow-2xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

