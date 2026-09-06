"use client";

import { useState, useTransition } from "react";
import {
  FileText,
  Search,
  RefreshCw,
  ExternalLink,
  Download,
  Eye,
  Trash2,
  Copy,
  Check,
  Calendar,
  User,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import {
  GeneratedReportItem,
  getGeneratedReportsAction,
  deleteGeneratedReportAction,
} from "@/actions/reports-history";
import { TablePagination } from "@/components/ui/TablePagination";
import { PdfReportModal } from "@/components/admin/PdfReportModal";
import { showCozyConfirm, showCozySuccess, showCozyError } from "@/lib/ui/swal";

interface ReportHistoryClientProps {
  initialData: {
    success: boolean;
    data?: {
      items: GeneratedReportItem[];
      totalItems: number;
      totalPages: number;
      page: number;
      pageSize: number;
    };
    message?: string;
  };
}

export function ReportHistoryClient({ initialData }: ReportHistoryClientProps) {
  const [data, setData] = useState(
    initialData.data || {
      items: [],
      totalItems: 0,
      totalPages: 1,
      page: 1,
      pageSize: 15,
    }
  );
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState("");
  const [targetClass, setTargetClass] = useState("ALL");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal preview state
  const [previewReport, setPreviewReport] = useState<GeneratedReportItem | null>(null);

  const fetchReports = (targetPage = data.page, targetPageSize = data.pageSize) => {
    startTransition(async () => {
      const res = await getGeneratedReportsAction({
        page: targetPage,
        pageSize: targetPageSize,
        search,
        targetClass,
      });
      if (res.success && res.data) {
        setData(res.data);
      } else if (!res.success) {
        showCozyError(res.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      }
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports(1, data.pageSize);
  };

  const handlePageChange = (newPage: number) => {
    fetchReports(newPage, data.pageSize);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    fetchReports(1, newPageSize);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleDelete = async (report: GeneratedReportItem) => {
    const confirmed = await showCozyConfirm({
      title: "ยืนยันการลบประวัติรายงาน",
      text: `คุณต้องการลบประวัติรายงานรหัส ${report.reportCode} ("${report.title}") หรือไม่? ไฟล์ต้นฉบับบน S3 จะถูกลบออกด้วย`,
      confirmText: "ยืนยันการลบ",
      cancelText: "ยกเลิก",
      icon: "warning",
    });

    if (!confirmed.isConfirmed) return;

    startTransition(async () => {
      const res = await deleteGeneratedReportAction(report.id);
      if (res.success) {
        showCozySuccess("ลบประวัติรายงานเรียบร้อยแล้ว");
        fetchReports(data.page, data.pageSize);
      } else {
        showCozyError(res.message || "ไม่สามารถลบรายงานได้");
      }
    });
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#EADBCC] shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center border border-[#EADBCC] shadow-2xs shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#3F342B] tracking-tight">
              ประวัติการออกรายงานทางการ
            </h1>
            <p className="text-xs sm:text-sm text-[#7A6A5C] mt-0.5">
              บันทึกเอกสาร PDF ที่เคยสร้าง ตรวจสอบรหัสเอกสาร และดาวน์โหลดไฟล์ต้นฉบับจาก S3
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchReports()}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FAF6F0] text-[#3F342B] border border-[#EADBCC] hover:bg-[#FAF0E1] active:scale-95 transition-all shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
          <span>รีเฟรชข้อมูล</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#EADBCC] shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#A8988B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาด้วยรหัสรายงาน (DOC-...), ชื่องาน, หรือชื่อผู้จัดพิมพ์..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-[#FAF6F0] border border-[#EADBCC] text-[#3F342B] placeholder-[#A8988B] focus:outline-hidden focus:ring-2 focus:ring-[#D9A441]/20 focus:border-[#D9A441]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={targetClass}
              onChange={(e) => {
                setTargetClass(e.target.value);
                // Trigger auto-fetch on class change
                startTransition(async () => {
                  const res = await getGeneratedReportsAction({
                    page: 1,
                    pageSize: data.pageSize,
                    search,
                    targetClass: e.target.value,
                  });
                  if (res.success && res.data) setData(res.data);
                });
              }}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-semibold bg-[#FAF6F0] border border-[#EADBCC] text-[#3F342B] focus:outline-hidden focus:ring-2 focus:ring-[#D9A441]/20 focus:border-[#D9A441] cursor-pointer"
            >
              <option value="ALL">ห้องเรียนทั้งหมด</option>
              <option value="1">ห้อง ม.1</option>
              <option value="2">ห้อง ม.2</option>
              <option value="3">ห้อง ม.3</option>
              <option value="4">ห้อง ม.4</option>
              <option value="5">ห้อง ม.5</option>
              <option value="6">ห้อง ม.6</option>
            </select>

            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#D9A441] hover:bg-[#C28F30] active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
            >
              ค้นหา
            </button>
          </div>
        </form>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#FAF6F0] border-b border-[#EADBCC]">
              <tr>
                <th className="py-3.5 pl-6 pr-3 text-xs font-bold text-[#7A6A5C] uppercase tracking-wider">
                  วันที่พิมพ์
                </th>
                <th className="py-3.5 px-3 text-xs font-bold text-[#7A6A5C] uppercase tracking-wider">
                  รหัสเอกสาร (Report Code)
                </th>
                <th className="py-3.5 px-3 text-xs font-bold text-[#7A6A5C] uppercase tracking-wider">
                  หัวข้อรายงาน & เป้าหมาย
                </th>
                <th className="py-3.5 px-3 text-xs font-bold text-[#7A6A5C] uppercase tracking-wider">
                  ผู้จัดพิมพ์
                </th>
                <th className="py-3.5 px-3 text-xs font-bold text-[#7A6A5C] uppercase tracking-wider text-right">
                  ขนาดไฟล์
                </th>
                <th className="py-3.5 pl-3 pr-6 text-xs font-bold text-[#7A6A5C] uppercase tracking-wider text-right">
                  จัดการ / เอกสาร
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E8DC]">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-2xl bg-[#FAF6F0] flex items-center justify-center border border-[#EADBCC] text-[#A8988B] mb-3">
                        <FileCheck className="w-7 h-7" />
                      </div>
                      <p className="text-sm font-bold text-[#3F342B]">ยังไม่มีประวัติการออกรายงาน</p>
                      <p className="text-xs text-[#7A6A5C] mt-1">
                        เมื่อมีการสั่งพิมพ์รายงานในระบบ รายการเอกสารและไฟล์ PDF จะถูกจัดเก็บบันทึกไว้ที่นี่
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.items.map((report) => (
                  <tr key={report.id} className="hover:bg-[#FAF6F0]/50 transition-colors">
                    {/* วันที่พิมพ์ */}
                    <td className="py-3.5 pl-6 pr-3 whitespace-nowrap text-xs text-[#5C4D3C]">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#A8988B]" />
                        <span>{formatDate(report.createdAt)}</span>
                      </div>
                      <span className="text-[10px] text-[#A8988B] block ml-5">
                        ภาคเรียน {report.academicTerm}
                      </span>
                    </td>

                    {/* รหัสเอกสาร */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#3F342B] bg-[#FAF0E1] px-2.5 py-1 rounded-lg border border-[#EADBCC]">
                          {report.reportCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(report.reportCode)}
                          title="คัดลอกรหัสเอกสาร"
                          className="p-1 rounded-md text-[#7A6A5C] hover:text-[#3F342B] hover:bg-[#FAF0E1] transition-colors cursor-pointer"
                        >
                          {copiedCode === report.reportCode ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* หัวข้อรายงาน & เป้าหมาย */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-xs text-[#3F342B] max-w-xs sm:max-w-sm truncate">
                        {report.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF6F0] text-[#7A6A5C] border border-[#EADBCC]">
                          {report.targetClass === "ALL"
                            ? "นักเรียนทั้งหมดทุกห้อง"
                            : `ห้อง ม.${report.targetClass}`}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                          {report.reportType === "ASSIGNMENT_REPORT"
                            ? "รายงานการส่งงาน"
                            : report.reportType === "ATTENDANCE_SUMMARY_REPORT"
                            ? "รายงานสรุปเวลาเรียน"
                            : report.reportType}
                        </span>
                      </div>
                    </td>

                    {/* ผู้จัดพิมพ์ */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-[#5C4D3C]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#A8988B]" />
                        <span className="font-medium">{report.printedByName}</span>
                      </div>
                    </td>

                    {/* ขนาดไฟล์ */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-[#7A6A5C] text-right font-mono">
                      {formatFileSize(report.fileSize)}
                    </td>

                    {/* จัดการ / ปุ่มคำสั่ง */}
                    <td className="py-3.5 pl-3 pr-6 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* ดูตัวอย่าง PDF Modal */}
                        <button
                          type="button"
                          onClick={() => setPreviewReport(report)}
                          title="เปิดดูรายงาน PDF ในหน้าต่างนี้"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FAF0E1] text-[#3F342B] border border-[#EADBCC] hover:bg-[#3F342B] hover:text-white transition-all shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">ดูตัวอย่าง</span>
                        </button>

                        {/* หน้าตรวจสอบ QR Verify */}
                        <a
                          href={`/verify/${report.reportCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="เปิดหน้าตรวจความถูกต้องของเอกสาร (QR Verification)"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">ตรวจสอบ</span>
                        </a>

                        {/* ดาวน์โหลดจาก S3 */}
                        <a
                          href={report.fileUrl}
                          download
                          title="ดาวน์โหลดไฟล์ PDF จาก Cloud Storage (S3)"
                          className="p-1.5 rounded-lg text-[#7A6A5C] hover:text-[#3F342B] hover:bg-[#FAF0E1] border border-transparent hover:border-[#EADBCC] transition-all cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </a>

                        {/* ลบประวัติรายงาน */}
                        <button
                          type="button"
                          onClick={() => handleDelete(report)}
                          title="ลบประวัติและไฟล์รายงาน"
                          className="p-1.5 rounded-lg text-[#A8988B] hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="p-4 border-t border-[#EADBCC] bg-[#FAF6F0]">
            <TablePagination
              currentPage={data.page}
              totalPages={data.totalPages}
              pageSize={data.pageSize}
              totalItems={data.totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 15, 30, 50]}
            />
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {previewReport && (
        <PdfReportModal
          isOpen={!!previewReport}
          onClose={() => setPreviewReport(null)}
          title={`รายงาน: ${previewReport.title} (${previewReport.reportCode})`}
          filename={`${previewReport.title}_${previewReport.reportCode}`}
          orientation="portrait"
          pdfApiUrl={previewReport.fileUrl}
        />
      )}
    </div>
  );
}
