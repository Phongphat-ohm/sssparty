"use client";

import { useState, useEffect, useTransition } from "react";
import {
  History,
  Search,
  Filter,
  Calendar,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Eye,
  X,
  FileText,
  User,
  Laptop,
  Globe,
  RefreshCw,
} from "lucide-react";
import { AuditLogItem, AuditLogsResult, getAuditLogsAction } from "@/actions/audit";
import { TablePagination } from "@/components/ui/TablePagination";

interface AuditLogsClientProps {
  initialData: AuditLogsResult;
}

export function AuditLogsClient({ initialData }: AuditLogsClientProps) {
  const [data, setData] = useState<AuditLogsResult>(initialData);
  const [isPending, startTransition] = useTransition();

  // Filters state
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [targetTypeFilter, setTargetTypeFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Selected Log for detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = (targetPage = page, targetPageSize = pageSize) => {
    startTransition(async () => {
      const res = await getAuditLogsAction({
        page: targetPage,
        pageSize: targetPageSize,
        action: actionFilter,
        targetType: targetTypeFilter,
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

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes("FAILED")) {
      return {
        label: "เข้าสู่ระบบล้มเหลว",
        color: "bg-red-50 text-red-700 border-red-200",
        icon: XCircle,
      };
    }
    if (action.includes("SUCCESS")) {
      return {
        label: "เข้าสู่ระบบสำเร็จ",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
      };
    }
    if (action.includes("LOGOUT")) {
      return {
        label: "ออกจากระบบ",
        color: "bg-stone-100 text-stone-700 border-stone-200",
        icon: Clock,
      };
    }
    if (action.includes("CREATE")) {
      return {
        label: "สร้างรายการ",
        color: "bg-blue-50 text-blue-700 border-blue-200",
        icon: FileText,
      };
    }
    if (action.includes("UPDATE") || action.includes("RESET") || action.includes("GRADE")) {
      return {
        label: "แก้ไข / ตรวจงาน",
        color: "bg-amber-50 text-amber-700 border-amber-200",
        icon: RefreshCw,
      };
    }
    if (action.includes("DELETE")) {
      return {
        label: "ลบรายการ",
        color: "bg-rose-50 text-rose-700 border-rose-200",
        icon: XCircle,
      };
    }

    return {
      label: action,
      color: "bg-stone-50 text-stone-700 border-stone-200",
      icon: Clock,
    };
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3F342B] tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-[#B94E48]" />
            บันทึกประวัติการใช้งาน (Audit Logs)
          </h1>
          <p className="text-xs sm:text-sm text-[#7A6A5C]">
            ตรวจสอบประวัติความปลอดภัย เหตุการณ์การเข้าสู่ระบบ และการดำเนินงานทั้งหมดของระบบ
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchLogs()}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#5A4D41] bg-white border border-[#D9CABB] hover:bg-[#FAF6F0] active:scale-95 transition-all shadow-2xs self-start cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin text-[#B94E48]" : ""}`} />
          <span>รีเฟรชข้อมูล</span>
        </button>
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
            เข้าสู่ระบบล้มเหลว
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
              placeholder="ค้นหาตามชื่อผู้ใช้, IP, รหัสเป้าหมาย, หรือรายละเอียด..."
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
            <span>หมวดหมู่:</span>
          </div>

          <select
            value={targetTypeFilter}
            onChange={(e) => {
              setTargetTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
          >
            <option value="ALL">ทุกหมวดหมู่ (Target Type)</option>
            <option value="AUTH">ระบบยืนยันตัวตน (AUTH)</option>
            <option value="ASSIGNMENT">การบ้าน (ASSIGNMENT)</option>
            <option value="SUBMISSION">การส่งงาน (SUBMISSION)</option>
            <option value="STUDENT">ข้อมูลนักเรียน (STUDENT)</option>
            <option value="ATTENDANCE">การเช็กชื่อ (ATTENDANCE)</option>
            <option value="USER">บัญชีผู้ดูแล (USER)</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
          >
            <option value="ALL">ทุกการกระทำ (Action)</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="CREATE_ASSIGNMENT">CREATE_ASSIGNMENT</option>
            <option value="UPDATE_ASSIGNMENT">UPDATE_ASSIGNMENT</option>
            <option value="DELETE_ASSIGNMENT">DELETE_ASSIGNMENT</option>
            <option value="GRADE_SUBMISSION">GRADE_SUBMISSION</option>
            <option value="CREATE_STUDENT">CREATE_STUDENT</option>
            <option value="UPDATE_STUDENT">UPDATE_STUDENT</option>
            <option value="IMPORT_STUDENTS_CSV">IMPORT_STUDENTS_CSV</option>
            <option value="CREATE_ATTENDANCE_SESSION">CREATE_ATTENDANCE_SESSION</option>
            <option value="SAVE_ATTENDANCE_RECORD">SAVE_ATTENDANCE_RECORD</option>
            <option value="UPDATE_USER_PERMISSIONS">UPDATE_USER_PERMISSIONS</option>
            <option value="RESET_PASSWORD">RESET_PASSWORD</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setActionFilter("ALL");
              setTargetTypeFilter("ALL");
              setStartDate("");
              setEndDate("");
              setPage(1);
              fetchLogs(1, pageSize);
            }}
            className="text-[11px] text-[#7A6A5C] hover:text-[#B94E48] underline underline-offset-2 ml-auto cursor-pointer"
          >
            ล้างตัวกรอง
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
            <span className="text-xs text-[#B94E48] font-semibold animate-pulse">
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
                              <span className="font-bold text-[#3F342B] block truncate max-w-[120px]">
                                {log.username || "ระบบ / ไม่ระบุ"}
                              </span>
                              {log.role && (
                                <span className="text-[9px] text-[#7A6A5C] font-semibold">
                                  {log.role === "ADMIN" ? "ผู้ดูแล" : "นักเรียน"}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}
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
                            className="p-1 rounded-lg text-[#7A6A5C] hover:text-[#B94E48] hover:bg-[#FAF0E1] transition-colors cursor-pointer"
                            title="ดูรายละเอียดเชิงลึก"
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

      {/* 5. Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="p-5 border-b border-[#F2E8DC] flex items-center justify-between bg-[#FFF9F0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FAF0E1] text-[#B94E48] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#3F342B] text-base leading-tight">
                    รายละเอียด Audit Log
                  </h3>
                  <p className="text-[11px] text-[#7A6A5C] font-mono">
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
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF6F0] rounded-2xl border border-[#EADBCC]">
                <div>
                  <span className="text-[10px] text-[#7A6A5C] block">วันเวลา</span>
                  <span className="font-mono font-semibold text-[#3F342B]">
                    {formatDate(selectedLog.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A6A5C] block">Action</span>
                  <span className="font-bold text-[#B94E48]">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A6A5C] block">ผู้ใช้งาน (User)</span>
                  <span className="font-bold text-[#3F342B]">
                    {selectedLog.username || "ไม่ระบุ"} ({selectedLog.role || "N/A"})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A6A5C] block">เป้าหมาย (Target)</span>
                  <span className="font-semibold text-[#3F342B]">
                    {selectedLog.targetType || "N/A"} {selectedLog.targetId ? `(#${selectedLog.targetId})` : ""}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-[#7A6A5C] block">IP Address</span>
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

              {/* Details / Payload */}
              <div className="space-y-1">
                <span className="font-bold text-[#5A4D41] flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  รายละเอียด (Details):
                </span>
                <div className="p-3 rounded-2xl bg-[#2A2420] text-[#FAF6F0] font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48">
                  {selectedLog.details || "ไม่มีข้อมูลรายละเอียดเพิ่มเติม"}
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
