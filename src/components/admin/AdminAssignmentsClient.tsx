"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  PlusCircle,
  Clock,
  Users,
  Edit3,
  Trash2,
  FileCheck2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  FileText,
  Printer,
  Loader2,
} from "lucide-react";
import { TablePagination } from "@/components/ui/TablePagination";
import { SortOrder } from "@/components/ui/SortableTableHeader";
import {
  toggleAssignmentStatusAction,
  deleteAssignmentAction,
} from "@/actions/assignment";
import {
  getComprehensiveEvaluationReportDataAction,
  ComprehensiveEvaluationReportData,
} from "@/actions/reports";
import { PdfReportModal } from "@/components/admin/PdfReportModal";
import { generateComprehensiveEvaluationReportHtml } from "@/lib/export/report-html-templates";
import { showCozyConfirm, showCozySuccess, showCozyError } from "@/lib/ui/swal";

export interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  maxScore: number;
  dueDate: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  rubricCount: number;
  submissionsCount: number;
  gradedCount: number;
  createdAt: string;
}

interface AdminAssignmentsClientProps {
  initialAssignments: AssignmentItem[];
  totalStudents: number;
}

export function AdminAssignmentsClient({
  initialAssignments,
  totalStudents,
}: AdminAssignmentsClientProps) {
  const [assignments, setAssignments] = useState<AssignmentItem[]>(initialAssignments);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // PDF Report State
  const [evaluationReportData, setEvaluationReportData] = useState<ComprehensiveEvaluationReportData | null>(null);
  const [isLoadingEvaluationReport, setIsLoadingEvaluationReport] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const handleOpenEvaluationPdf = async () => {
    setIsLoadingEvaluationReport(true);
    try {
      const res = await getComprehensiveEvaluationReportDataAction("ALL");
      if (res.success && res.data) {
        setEvaluationReportData(res.data);
        setIsPdfModalOpen(true);
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message || "ไม่สามารถโหลดข้อมูลรายงานได้");
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsLoadingEvaluationReport(false);
    }
  };

  // Sort & Pagination
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === "asc") setSortOrder("desc");
      else if (sortOrder === "desc") {
        setSortField("createdAt");
        setSortOrder("desc");
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const handleToggleStatus = async (id: string, newStatus: "PUBLISHED" | "CLOSED") => {
    try {
      const res = await toggleAssignmentStatusAction(id, newStatus);
      if (res.success) {
        setAssignments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
        );
        await showCozySuccess("สำเร็จ!", res.message);
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await showCozyConfirm(
      "ยืนยันการลบการบ้าน?",
      `คุณต้องการลบ "${title}" ใช่หรือไม่?`
    );
    if (!confirmed.isConfirmed) return;

    try {
      const res = await deleteAssignmentAction(id);
      if (res.success) {
        setAssignments((prev) => prev.filter((a) => a.id !== id));
        await showCozySuccess("ลบสำเร็จ!", res.message);
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    }
  };

  const filtered = assignments.filter((a) => {
    const matchStatus = statusFilter === "ALL" || a.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortField || !sortOrder) return 0;
    let valA: any = (a as any)[sortField];
    let valB: any = (b as any)[sortField];

    if (sortField === "dueDate" || sortField === "createdAt") {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3F342B] tracking-tight">
            การบ้านและภาระงานทั้งหมด
          </h1>
          <p className="text-xs sm:text-sm text-[#7A6A5C]">
            จัดการ กำหนดเกณฑ์ Rubric และติดตามสถานะการส่งงานของนักเรียนในชุมนุม
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <a
            href="/api/export/gradebook"
            download
            title="ส่งออกสมุดคะแนนรวมทุกการบ้านเป็นไฟล์ Excel/CSV"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-all shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export สมุดคะแนน (.csv)</span>
          </a>

          <button
            type="button"
            onClick={handleOpenEvaluationPdf}
            disabled={isLoadingEvaluationReport}
            title="พรีวิวและพิมพ์รายงานสรุปผลการเรียนและเวลาเรียน / บันทึกเป็น PDF (A4 แนวนอน)"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-[#3F342B] bg-[#FAF0E1] hover:bg-[#3F342B] hover:text-white border border-[#D9CABB] active:scale-95 disabled:opacity-60 transition-all shadow-2xs cursor-pointer"
          >
            {isLoadingEvaluationReport ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>พิมพ์รายงานผลการเรียน (Print / PDF)</span>
          </button>

          <Link
            href="/admin/assignments/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#B94E48] hover:bg-[#A33F39] active:scale-[0.99] transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>สร้างการบ้านใหม่</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { key: "ALL", label: `ทั้งหมด (${assignments.length})` },
            {
              key: "PUBLISHED",
              label: `เปิดรับงาน (${assignments.filter((a) => a.status === "PUBLISHED").length})`,
            },
            {
              key: "DRAFT",
              label: `ฉบับร่าง (${assignments.filter((a) => a.status === "DRAFT").length})`,
            },
            {
              key: "CLOSED",
              label: `ปิดรับงาน (${assignments.filter((a) => a.status === "CLOSED").length})`,
            },
          ].map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => {
                setStatusFilter(st.key);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === st.key
                  ? "bg-[#3F342B] text-white shadow-xs"
                  : "bg-[#FAF6F0] text-[#7A6A5C] border border-[#EADBCC] hover:bg-[#FAF0E1]"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#A8988B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="ค้นหาชื่องานหรือคำอธิบาย..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
          />
        </div>
      </div>

      {/* Sorting Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-[#EADBCC] shadow-2xs text-xs">
        <span className="text-[#7A6A5C] font-semibold text-[11px]">เรียงลำดับตาม:</span>
        {[
          { field: "createdAt", label: "วันที่สร้าง" },
          { field: "dueDate", label: "กำหนดส่ง" },
          { field: "maxScore", label: "คะแนนเต็ม" },
          { field: "submissionsCount", label: "จำนวนงานที่ส่ง" },
        ].map((item) => {
          const isCurrent = sortField === item.field;
          return (
            <button
              key={item.field}
              type="button"
              onClick={() => handleSort(item.field)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isCurrent
                  ? "bg-[#FAF0E1] text-[#8C5D23] border border-[#D9CABB]"
                  : "text-[#7A6A5C] hover:bg-[#FAF6F0]"
              }`}
            >
              <span>{item.label}</span>
              {isCurrent ? (
                sortOrder === "asc" ? (
                  <ArrowUp className="w-3 h-3 text-[#D9A441]" />
                ) : (
                  <ArrowDown className="w-3 h-3 text-[#D9A441]" />
                )
              ) : (
                <ArrowUpDown className="w-3 h-3 opacity-40" />
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#EADBCC] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-[#3F342B] text-base">ไม่พบรายการการบ้าน</h3>
            <p className="text-xs text-[#7A6A5C]">
              ยังไม่มีการบ้านที่ตรงกับเงื่อนไขการค้นหา
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {paginated.map((assignment) => {
              const percentSubmitted =
                totalStudents > 0
                  ? Math.round((assignment.submissionsCount / totalStudents) * 100)
                  : 0;
              const isDuePassed = new Date(assignment.dueDate).getTime() < Date.now();

              return (
                <div
                  key={assignment.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-xs hover:border-[#D9A441]/50 transition-all space-y-4"
                >
                  {/* Top Row: Title & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            assignment.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : assignment.status === "DRAFT"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-stone-50 text-stone-700 border-stone-200"
                          }`}
                        >
                          {assignment.status === "PUBLISHED"
                            ? "● เปิดรับส่งงาน"
                            : assignment.status === "DRAFT"
                            ? "○ ฉบับร่าง"
                            : "✕ ปิดรับงานแล้ว"}
                        </span>

                        {isDuePassed && assignment.status === "PUBLISHED" && (
                          <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            ครบกำหนดแล้ว
                          </span>
                        )}
                      </div>

                      <h2 className="text-lg font-bold text-[#3F342B]">
                        {assignment.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FAF0E1] text-[#8C5D23] border border-[#EADBCC]">
                        เต็ม {assignment.maxScore} คะแนน ({assignment.rubricCount} เกณฑ์)
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#5A4D41] leading-relaxed line-clamp-2">
                    {assignment.description}
                  </p>

                  {/* Progress & Submission Stats */}
                  <div className="p-3.5 bg-[#FAF6F0] rounded-2xl border border-[#EADBCC] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#5A4D41] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#C96B4B]" />
                        ความคืบหน้าการส่งงาน:
                      </span>
                      <span className="font-bold text-[#3F342B]">
                        {assignment.submissionsCount} / {totalStudents} คน (
                        {percentSubmitted}%)
                        {assignment.gradedCount > 0 &&
                          ` • ตรวจแล้ว ${assignment.gradedCount} คน`}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-[#EADBCC] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#D9A441] to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentSubmitted}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom Row: Due date & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#F2E8DC]">
                    <span className="text-xs text-[#7A6A5C] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#C96B4B]" />
                      กำหนดส่ง:{" "}
                      <strong className="text-[#3F342B]">
                        {new Date(assignment.dueDate).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/assignments/${assignment.id}/submissions`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FAF0E1] text-[#8C5D23] hover:bg-[#F2DFC6] transition-colors"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        ตรวจงาน ({assignment.submissionsCount})
                      </Link>

                      <Link
                        href={`/admin/assignments/${assignment.id}/edit`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#D9CABB] text-[#5A4D41] hover:border-[#D9A441] transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        แก้ไข
                      </Link>

                      {assignment.status === "DRAFT" ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(assignment.id, "PUBLISHED")}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          เผยแพร่งาน
                        </button>
                      ) : assignment.status === "PUBLISHED" ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(assignment.id, "CLOSED")}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100 transition-colors cursor-pointer"
                        >
                          ปิดรับงาน
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(assignment.id, "PUBLISHED")}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          เปิดรับงานอีกครั้ง
                        </button>
                      )}

                      {assignment.submissionsCount === 0 && (
                        <button
                          type="button"
                          onClick={() => handleDelete(assignment.id, assignment.title)}
                          className="p-2 rounded-xl text-[#B94E48] hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                          title="ลบการบ้านนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs overflow-hidden">
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

      {/* Printable Evaluation Report Modal */}
      {evaluationReportData && (
        <PdfReportModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          title="แบบรายงานสรุปผลการเรียนรู้และการเข้าร่วมกิจกรรมพัฒนาผู้เรียน (กิจกรรมชุมนุม)"
          orientation="landscape"
          filename={`รายงานผลการเรียนรู้_${evaluationReportData.clubName.replace(/\s+/g, "_")}_${evaluationReportData.academicTerm.replace(/[\/\\]/g, "-")}`}
          pdfApiUrl="/api/export/evaluation/render?className=ALL"
          htmlContent={generateComprehensiveEvaluationReportHtml(evaluationReportData)}
        />
      )}
    </div>
  );
}
