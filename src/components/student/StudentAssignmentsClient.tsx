"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  ArrowRight,
  FileText,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { TablePagination } from "@/components/ui/TablePagination";
import { SortOrder } from "@/components/ui/SortableTableHeader";

export interface StudentAssignmentItem {
  id: string;
  title: string;
  description: string;
  maxScore: number;
  dueDate: string;
  rubricCount: number;
  submission?: {
    id: string;
    status: "SUBMITTED" | "LATE" | "GRADED";
    score?: number | null;
  } | null;
}

interface StudentAssignmentsClientProps {
  assignments: StudentAssignmentItem[];
}

export function StudentAssignmentsClient({
  assignments,
}: StudentAssignmentsClientProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort & Pagination
  const [sortField, setSortField] = useState<string>("dueDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === "asc") setSortOrder("desc");
      else if (sortOrder === "desc") {
        setSortField("dueDate");
        setSortOrder("asc");
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const pendingCount = assignments.filter((a) => !a.submission).length;
  const submittedCount = assignments.filter(
    (a) => a.submission?.status === "SUBMITTED"
  ).length;
  const gradedCount = assignments.filter((a) => a.submission?.status === "GRADED").length;
  const lateCount = assignments.filter((a) => a.submission?.status === "LATE").length;

  const filtered = assignments.filter((a) => {
    const sub = a.submission;
    let matchStatus = true;
    if (statusFilter === "PENDING") matchStatus = !sub;
    else if (statusFilter === "SUBMITTED") matchStatus = sub?.status === "SUBMITTED";
    else if (statusFilter === "GRADED") matchStatus = sub?.status === "GRADED";
    else if (statusFilter === "LATE") matchStatus = sub?.status === "LATE";

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

    if (sortField === "dueDate") {
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
      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: "ALL", label: `ทั้งหมด (${assignments.length})` },
              { key: "PENDING", label: `ยังไม่ส่ง (${pendingCount})` },
              { key: "SUBMITTED", label: `รอตรวจ (${submittedCount})` },
              { key: "GRADED", label: `ตรวจแล้ว (${gradedCount})` },
              { key: "LATE", label: `ส่งช้า (${lateCount})` },
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
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-[#A8988B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหาภาระงาน..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
          </div>
        </div>

        {/* Sorting Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F2E8DC] text-xs">
          <span className="text-[#7A6A5C] font-semibold text-[11px]">เรียงลำดับตาม:</span>
          {[
            { field: "dueDate", label: "กำหนดส่ง" },
            { field: "maxScore", label: "คะแนนเต็ม" },
            { field: "title", label: "ชื่องาน" },
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
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#EADBCC] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <p className="font-bold text-[#3F342B] text-sm">ไม่พบภาระงานในหมวดนี้</p>
          <p className="text-xs text-[#7A6A5C]">
            คุณสามารถเลือกดูการบ้านในหมวดอื่นๆ ได้จากแท็บด้านบน
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {paginated.map((assignment) => {
              const submission = assignment.submission;
              const isSubmitted = !!submission;
              const isGraded = submission?.status === "GRADED";
              const isLate = submission?.status === "LATE";
              const isPastDue = Date.now() > new Date(assignment.dueDate).getTime();

              return (
                <div
                  key={assignment.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-xs hover:border-[#D9A441]/60 hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="font-bold text-[#3F342B] text-base sm:text-lg">
                        {assignment.title}
                      </h2>
                      <p className="text-xs text-[#7A6A5C] flex items-center gap-1.5">
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
                        {isPastDue && !isSubmitted && (
                          <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-bold">
                            เลยกำหนดส่งแล้ว
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FAF0E1] text-[#8C5D23] border border-[#EADBCC]">
                        เต็ม {assignment.maxScore} คะแนน
                      </span>

                      {isGraded ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-emerald-600" />
                          ได้คะแนน: {submission.score} / {assignment.maxScore}
                        </span>
                      ) : isLate ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          ส่งล่าช้า (รอตรวจ)
                        </span>
                      ) : isSubmitted ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          ส่งตรงเวลา (รอตรวจ)
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          ยังไม่ได้ส่ง
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#5A4D41] leading-relaxed line-clamp-2">
                    {assignment.description}
                  </p>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#F2E8DC]">
                    <span className="text-xs text-[#7A6A5C] flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-[#D9A441]" />
                      {assignment.rubricCount} เกณฑ์การประเมิน
                    </span>

                    <Link
                      href={`/student/assignments/${assignment.id}`}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isSubmitted
                          ? "bg-[#FAF6F0] border border-[#D9CABB] text-[#3F342B] hover:border-[#D9A441]"
                          : "bg-[#D9A441] text-white hover:bg-[#C28F30] shadow-2xs"
                      }`}
                    >
                      <span>{isSubmitted ? "ดูข้อมูลการส่งงาน" : "เปิดดูและส่งงาน"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
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
              pageSizeOptions={[4, 8, 16]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
