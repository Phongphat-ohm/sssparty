"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  FileCheck2,
  AlertTriangle,
  BookOpen,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { TablePagination } from "@/components/ui/TablePagination";
import { SortOrder } from "@/components/ui/SortableTableHeader";

export interface GradingQueueItem {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  className: string;
  studentNumber: number;
  assignmentId: string;
  assignmentTitle: string;
  maxScore: number;
  submissionType?: "FILE" | "LINK" | "QUESTIONS";
  fileName?: string | null;
  fileSize?: number | null;
  submittedAt: string;
  status: "DRAFT" | "SUBMITTED" | "LATE" | "GRADED";
  score?: number | null;
}

interface GradingQueueClientProps {
  initialItems: GradingQueueItem[];
  assignmentsList: { id: string; title: string }[];
  classList: string[];
}

export function GradingQueueClient({
  initialItems,
  assignmentsList,
  classList,
}: GradingQueueClientProps) {
  const [items] = useState<GradingQueueItem>(initialItems as any);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort & Pagination
  const [sortField, setSortField] = useState<string>("submittedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === "asc") setSortOrder("desc");
      else if (sortOrder === "desc") {
        setSortField("submittedAt");
        setSortOrder("desc");
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const filtered = initialItems.filter((item) => {
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PENDING" && item.status !== "GRADED") ||
      item.status === statusFilter;

    const matchClass = classFilter === "ALL" || item.className === classFilter;
    const matchAssignment =
      assignmentFilter === "ALL" || item.assignmentId === assignmentFilter;

    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      item.studentName.toLowerCase().includes(q) ||
      item.studentCode.toLowerCase().includes(q) ||
      item.assignmentTitle.toLowerCase().includes(q) ||
      (item.fileName ? item.fileName.toLowerCase().includes(q) : false);

    return matchStatus && matchClass && matchAssignment && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortField || !sortOrder) return 0;
    let valA: any = (a as any)[sortField];
    let valB: any = (b as any)[sortField];

    if (sortField === "submittedAt") {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pendingCount = initialItems.filter((s) => s.status !== "GRADED").length;
  const gradedCount = initialItems.filter((s) => s.status === "GRADED").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#3F342B] tracking-tight flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-[#B94E48]" />
          ห้องตรวจงานครู (Teacher Grading Studio)
        </h1>
        <p className="text-xs sm:text-sm text-[#7A6A5C]">
          ผลงานทั้งหมดที่นักเรียนส่งเข้ามา รอการตรวจให้คะแนนและคำติชม
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#EADBCC] shadow-2xs">
          <p className="text-xs text-[#7A6A5C]">ชิ้นงานที่ส่งเข้ามาทั้งหมด</p>
          <p className="text-2xl font-bold text-[#3F342B]">{initialItems.length} ชิ้น</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-2xs">
          <p className="text-xs text-amber-700">รอการตรวจ (Pending)</p>
          <p className="text-2xl font-bold text-amber-700">{pendingCount} ชิ้น</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-2xs">
          <p className="text-xs text-emerald-700">ตรวจเสร็จสิ้นแล้ว (Graded)</p>
          <p className="text-2xl font-bold text-emerald-700">{gradedCount} ชิ้น</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: "ALL", label: `ทั้งหมด (${initialItems.length})` },
              { key: "PENDING", label: `รอตรวจ (${pendingCount})` },
              { key: "GRADED", label: `ตรวจแล้ว (${gradedCount})` },
              {
                key: "LATE",
                label: `ส่งช้า (${initialItems.filter((i) => i.status === "LATE").length})`,
              },
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
                    ? "bg-[#3F342B] text-white shadow-2xs"
                    : "bg-[#FAF6F0] text-[#7A6A5C] hover:bg-[#FAF0E1]"
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
              placeholder="ค้นหาชื่อ, การบ้าน, ไฟล์..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
          </div>
        </div>

        {/* Dropdown Filters: Room & Assignment */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#F2E8DC]">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#7A6A5C]">ห้อง:</span>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded-lg border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] cursor-pointer"
            >
              <option value="ALL">ทุกห้อง</option>
              {classList.map((c) => (
                <option key={c} value={c}>
                  ห้อง {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#7A6A5C]">การบ้าน:</span>
            <select
              value={assignmentFilter}
              onChange={(e) => {
                setAssignmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded-lg border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] cursor-pointer max-w-[200px] truncate"
            >
              <option value="ALL">ทุกการบ้าน</option>
              {assignmentsList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sorting Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-[#EADBCC] shadow-2xs text-xs">
        <span className="text-[#7A6A5C] font-semibold text-[11px]">เรียงลำดับตาม:</span>
        {[
          { field: "submittedAt", label: "เวลาที่ส่ง" },
          { field: "studentNumber", label: "เลขที่" },
          { field: "score", label: "คะแนน" },
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
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-12 text-center text-[#7A6A5C] text-sm">
            ไม่พบผลงานที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          <div>
            <div className="divide-y divide-[#F2E8DC]">
              {paginated.map((sub) => {
                const isGraded = sub.status === "GRADED";
                const isLate = sub.status === "LATE";

                return (
                  <div
                    key={sub.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF6F0]/60 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#3F342B] bg-[#FAF0E1] px-2.5 py-0.5 rounded-lg border border-[#EADBCC]">
                          {sub.className} เลขที่ {sub.studentNumber}
                        </span>
                        <strong className="text-sm text-[#3F342B]">
                          {sub.studentName}
                        </strong>
                      </div>

                      <p className="text-xs text-[#7A6A5C] flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-[#D9A441]" />
                        การบ้าน:{" "}
                        <strong className="text-[#5A4D41]">{sub.assignmentTitle}</strong>
                      </p>

                      <p className="text-[11px] text-[#A8988B]">
                        {sub.fileName
                          ? `ไฟล์: ${sub.fileName} (${((sub.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB) • `
                          : sub.submissionType === "LINK"
                          ? "ส่งแบบลิงก์ • "
                          : sub.submissionType === "QUESTIONS"
                          ? "ส่งแบบตอบคำถาม • "
                          : ""}
                        ส่งเมื่อ{" "}
                        {new Date(sub.submittedAt).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {isGraded ? (
                        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          ได้: {sub.score} / {sub.maxScore}
                        </span>
                      ) : isLate ? (
                        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          ส่งล่าช้า (รอตรวจ)
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          รอตรวจ (ตรงเวลา)
                        </span>
                      )}

                      <Link
                        href={`/admin/submissions/${sub.id}`}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                          isGraded
                            ? "bg-white border border-[#D9CABB] text-[#5A4D41] hover:border-[#D9A441]"
                            : "bg-[#B94E48] text-white hover:bg-[#A33F39] active:scale-95"
                        }`}
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>{isGraded ? "ดู / แก้ไขเกรด" : "เข้าตรวจงาน"}</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={sorted.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
