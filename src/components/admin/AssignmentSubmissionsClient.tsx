"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  ExternalLink,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RotateCcw,
  Archive,
} from "lucide-react";
import { TablePagination } from "@/components/ui/TablePagination";
import { SortableTableHeader, SortOrder } from "@/components/ui/SortableTableHeader";
import { ActionDropdown } from "@/components/ui/ActionDropdown";
import { PdfReportModal } from "@/components/admin/PdfReportModal";
import { formatThaiDateTime } from "@/lib/utils/date-thai";

export interface StudentSubmissionRow {
  studentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  className: string;
  studentNumber: number;
  submissionId?: string;
  fileName?: string | null;
  submittedAt?: string;
  status?: "DRAFT" | "SUBMITTED" | "LATE" | "GRADED" | "RETURNED" | "NOT_SUBMITTED";
  returnReason?: string | null;
  returnedAt?: string | null;
  score?: number | null;
  maxScore: number;
}

interface AssignmentSubmissionsClientProps {
  assignmentId: string;
  assignmentTitle?: string;
  maxScore?: number;
  dueDate?: string;
  rows: StudentSubmissionRow[];
  classList: string[];
}

export function AssignmentSubmissionsClient({
  assignmentId,
  assignmentTitle = "การบ้าน",
  maxScore = 10,
  dueDate,
  rows,
  classList,
}: AssignmentSubmissionsClientProps) {
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const handlePrintReport = () => {
    setIsPdfModalOpen(true);
  };

  // Sort & Pagination
  const [sortField, setSortField] = useState<string>("studentNumber");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

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

  const filtered = rows.filter((r) => {
    const matchClass = selectedClass === "ALL" || r.className === selectedClass;
    const itemStatus = r.status || "NOT_SUBMITTED";
    const matchStatus = selectedStatus === "ALL" || itemStatus === selectedStatus;
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

    if (sortField === "submittedAt") {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      {/* Filters and Search Bar */}
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
              ทุกห้อง ({rows.length})
            </button>
            {classList.map((cls) => {
              const count = rows.filter((r) => r.className === cls).length;
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

          {/* Action buttons & Search */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Export & Print Dropdown */}
            <ActionDropdown
              label="ส่งออก & รายงาน"
              icon={Download}
              menuWidth="w-64"
              groups={[
                {
                  title: "ดาวน์โหลดและรายงานผล",
                  items: [
                    {
                      label: "พิมพ์รายงานผลการส่งงาน (PDF)",
                      subLabel: "พรีวิว/พิมพ์ใบคะแนนและรายงานสรุป",
                      icon: Printer,
                      onClick: handlePrintReport,
                    },
                    {
                      label: "ส่งออกคะแนน (CSV)",
                      subLabel: "ดาวน์โหลดคะแนนและสถานะเป็นไฟล์ Excel/CSV",
                      icon: FileSpreadsheet,
                      href: `/api/export/assignments/${assignmentId}?className=${selectedClass}`,
                      download: true,
                    },
                    {
                      label: "ดาวน์โหลดไฟล์งานทั้งหมด (ZIP)",
                      subLabel: "บีบอัดไฟล์ผลงานของนักเรียนในห้องที่เลือก",
                      icon: Archive,
                      href: `/api/assignments/${assignmentId}/download-zip?className=${selectedClass}`,
                      download: true,
                    },
                  ],
                },
              ]}
            />

            {/* Search */}
            <div className="relative w-full sm:w-52">
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

        {/* Status Filter */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#F2E8DC]">
          <span className="text-[11px] font-semibold text-[#7A6A5C] mr-1">สถานะ:</span>
          {[
            { key: "ALL", label: `ทั้งหมด (${rows.length})` },
            {
              key: "GRADED",
              label: `ตรวจแล้ว (${rows.filter((r) => r.status === "GRADED").length})`,
            },
            {
              key: "SUBMITTED",
              label: `รอตรวจ (${rows.filter((r) => r.status === "SUBMITTED" || r.status === "LATE").length})`,
            },
            {
              key: "RETURNED",
              label: `ถูกตีกลับ (${rows.filter((r) => r.status === "RETURNED").length})`,
            },
            {
              key: "NOT_SUBMITTED",
              label: `ยังไม่ส่ง (${rows.filter((r) => !r.status || r.status === "NOT_SUBMITTED").length})`,
            },
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
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs overflow-hidden">
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
                <th className="p-3 text-xs font-bold text-[#5A4D41] text-center">สถานะ</th>
                <SortableTableHeader
                  label="คะแนนที่ได้"
                  field="score"
                  currentSortField={sortField}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                  className="text-center w-28"
                />
                <SortableTableHeader
                  label="เวลาที่ส่ง"
                  field="submittedAt"
                  currentSortField={sortField}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                  className="w-36"
                />
                <th className="p-3 pr-5 text-xs font-bold text-[#5A4D41] text-right">
                  การจัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E8DC] text-xs">
              {paginated.map((r) => {
                const isSubmitted = !!r.submissionId;
                const isGraded = r.status === "GRADED";
                const isLate = r.status === "LATE";

                return (
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
                      {!isSubmitted ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                          ยังไม่ส่ง
                        </span>
                      ) : isGraded ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          ตรวจแล้ว
                        </span>
                      ) : r.status === "RETURNED" ? (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 inline-flex items-center gap-1"
                          title={r.returnReason ? `เหตุผล: ${r.returnReason}` : "ถูกตีกลับให้แก้ไข"}
                        >
                          <RotateCcw className="w-3 h-3" />
                          ถูกตีกลับ
                        </span>
                      ) : isLate ? (
                        r.returnedAt ? (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300 inline-flex items-center gap-1"
                            title={r.returnReason ? `ส่งงานใหม่ล่าช้า (เหตุผลเดิมที่ตีกลับ: ${r.returnReason})` : "ส่งงานใหม่ล่าช้า (รอตรวจ)"}
                          >
                            <RotateCcw className="w-3 h-3 text-orange-700" />
                            ส่งงานใหม่ช้า (รอตรวจ)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            ส่งช้า (รอตรวจ)
                          </span>
                        )
                      ) : r.returnedAt ? (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1"
                          title={r.returnReason ? `ส่งงานใหม่หลังถูกตีกลับ (เหตุผลเดิม: ${r.returnReason})` : "ส่งงานใหม่หลังถูกตีกลับ (รอตรวจ)"}
                        >
                          <RotateCcw className="w-3 h-3 text-indigo-600" />
                          ส่งงานใหม่ (รอตรวจ)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ส่งแล้ว (รอตรวจ)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold">
                      {isGraded ? (
                        <span className="text-[#B94E48]">
                          {r.score} / {r.maxScore}
                        </span>
                      ) : (
                        <span className="text-[#A8988B]">-</span>
                      )}
                    </td>
                    <td className="p-3 text-[#7A6A5C]">
                      {formatThaiDateTime(r.submittedAt)}
                    </td>
                    <td className="p-3 pr-5 text-right">
                      {isSubmitted ? (
                        <Link
                          href={`/admin/submissions/${r.submissionId}`}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-2xs ${
                            isGraded
                              ? "bg-white border border-[#D9CABB] text-[#5A4D41] hover:border-[#D9A441]"
                              : "bg-[#B94E48] text-white hover:bg-[#A33F39]"
                          }`}
                        >
                          <span>{isGraded ? "ดูคะแนน / ตรวจซ้ำ" : "ตรวจงาน"}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-[11px] text-[#A8988B] italic">
                          รอการส่งงาน
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

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

      {/* Printable Report Modal */}
      <PdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title={`รายงานสรุปผลการส่งงาน: ${assignmentTitle}`}
        filename={`รายงานผลการส่งงาน_${assignmentTitle}_${selectedClass === "ALL" ? "ทุกห้อง" : `ห้อง_${selectedClass}`}`}
        orientation="portrait"
        pdfApiUrl={`/api/export/assignments/${assignmentId}/render?className=${selectedClass}&mode=preview`}
        reportType="ASSIGNMENT"
        assignmentId={assignmentId}
        filterClass={selectedClass}
      />
    </div>
  );
}
