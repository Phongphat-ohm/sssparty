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
  Send,
  Link2,
  HelpCircle,
  X,
  Edit3,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { TablePagination } from "@/components/ui/TablePagination";
import { SortOrder } from "@/components/ui/SortableTableHeader";
import { formatThaiDateTime } from "@/lib/utils/date-thai";

export interface StudentAssignmentItem {
  id: string;
  title: string;
  description: string;
  maxScore: number;
  dueDate: string;
  allowLateSubmission?: boolean;
  lateDueDate?: string | null;
  submissionType?: "FILE" | "LINK" | "QUESTIONS";
  rubricCount: number;
  submission?: {
    id: string;
    status: "DRAFT" | "SUBMITTED" | "LATE" | "GRADED" | "RETURNED";
    score?: number | null;
  } | null;
}

interface StudentAssignmentsClientProps {
  assignments: StudentAssignmentItem[];
}

export function StudentAssignmentsClient({
  assignments,
}: StudentAssignmentsClientProps) {
  const [statusFilter, setStatusFilter] = useState<string>("TODO");
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

  const now = Date.now();

  // Counts
  const todoCount = assignments.filter((a) => {
    const sub = a.submission;
    const isSubmitted =
      sub && (sub.status === "SUBMITTED" || sub.status === "LATE" || sub.status === "GRADED");
    const isPastDue = now > new Date(a.dueDate).getTime();
    return !isPastDue && !isSubmitted;
  }).length;

  const overdueCount = assignments.filter((a) => {
    const sub = a.submission;
    const isSubmitted =
      sub && (sub.status === "SUBMITTED" || sub.status === "LATE" || sub.status === "GRADED");
    const isPastDue = now > new Date(a.dueDate).getTime();
    return isPastDue && !isSubmitted;
  }).length;

  const returnedCount = assignments.filter(
    (a) => a.submission?.status === "RETURNED"
  ).length;
  const inReviewCount = assignments.filter(
    (a) => a.submission?.status === "SUBMITTED" || a.submission?.status === "LATE"
  ).length;
  const gradedCount = assignments.filter(
    (a) => a.submission?.status === "GRADED"
  ).length;

  const filtered = assignments.filter((a) => {
    const sub = a.submission;
    const isSubmitted =
      sub && (sub.status === "SUBMITTED" || sub.status === "LATE" || sub.status === "GRADED");
    const isPastDue = now > new Date(a.dueDate).getTime();

    let matchStatus = true;
    if (statusFilter === "TODO") {
      matchStatus = !isPastDue && !isSubmitted;
    } else if (statusFilter === "OVERDUE") {
      matchStatus = isPastDue && !isSubmitted;
    } else if (statusFilter === "RETURNED") {
      matchStatus = sub?.status === "RETURNED";
    } else if (statusFilter === "IN_REVIEW") {
      matchStatus = sub?.status === "SUBMITTED" || sub?.status === "LATE";
    } else if (statusFilter === "GRADED") {
      matchStatus = sub?.status === "GRADED";
    }

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
      {/* 1. Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EADBCC] shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Action-Oriented Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#FAF6F0] rounded-2xl border border-[#EADBCC]">
            {[
              { key: "TODO", label: "ค้างส่ง (To-Do)", count: todoCount },
              { key: "OVERDUE", label: "เลยกำหนด", count: overdueCount, isOverdueTab: true },
              { key: "RETURNED", label: "ตีกลับให้แก้ไข", count: returnedCount },
              { key: "IN_REVIEW", label: "รอตรวจ", count: inReviewCount },
              { key: "GRADED", label: "ตรวจแล้ว", count: gradedCount },
              { key: "ALL", label: "ทั้งหมด", count: assignments.length },
            ].map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? tab.isOverdueTab && tab.count > 0
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-[#D9A441] text-white shadow-xs"
                      : tab.isOverdueTab && tab.count > 0
                      ? "text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                      : "text-[#7A6A5C] hover:text-[#3F342B] hover:bg-white/80"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? "bg-white/25 text-white"
                        : tab.isOverdueTab && tab.count > 0
                        ? "bg-rose-100 text-rose-800"
                        : "bg-[#EADBCC] text-[#7A6A5C]"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-[#A8988B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหาชื่อหรือคำสั่งงาน..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] placeholder-[#A8988B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A8988B] hover:text-[#3F342B]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sorting Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-[#F2E8DC] text-xs">
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
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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

      {/* 2. Assignment List */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#EADBCC] space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center mx-auto shadow-2xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <p className="font-bold text-[#3F342B] text-base">ไม่พบภาระงานในหมวดนี้</p>
          <p className="text-xs text-[#7A6A5C] max-w-sm mx-auto">
            {searchQuery
              ? `ไม่พบงานที่ตรงกับคำค้นหา "${searchQuery}" ลองค้นหาด้วยคำอื่น`
              : "ยอดเยี่ยมมาก! ไม่มีงานที่ค้างส่งในหมวดหมู่นี้ คุณสามารถเลือกดูงานในแท็บอื่นๆ ได้"}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 gap-3.5">
            {paginated.map((assignment) => {
              const submission = assignment.submission;
              const isSubmitted = !!submission;
              const isDraft = submission?.status === "DRAFT";
              const isReturned = submission?.status === "RETURNED";
              const isGraded = submission?.status === "GRADED";
              const isLate = submission?.status === "LATE";
              const isPastDue = Date.now() > new Date(assignment.dueDate).getTime();

              return (
                <div
                  key={assignment.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-2xs hover:border-[#D9A441] hover:shadow-md transition-all space-y-3.5 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Submission Type Badge */}
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            assignment.submissionType === "FILE"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : assignment.submissionType === "LINK"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-purple-50 text-purple-800 border-purple-200"
                          }`}
                        >
                          {assignment.submissionType === "FILE" && (
                            <>
                              <FileText className="w-3 h-3" />
                              <span>แนบไฟล์</span>
                            </>
                          )}
                          {assignment.submissionType === "LINK" && (
                            <>
                              <Link2 className="w-3 h-3" />
                              <span>ส่งลิงก์</span>
                            </>
                          )}
                          {assignment.submissionType === "QUESTIONS" && (
                            <>
                              <HelpCircle className="w-3 h-3" />
                              <span>ตอบคำถาม</span>
                            </>
                          )}
                        </span>

                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF0E1] text-[#8C5D23] border border-[#EADBCC]">
                          เต็ม {assignment.maxScore} คะแนน
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="font-bold text-[#3F342B] text-base sm:text-lg group-hover:text-[#8C5D23] transition-colors leading-snug">
                        <Link href={`/student/assignments/${assignment.id}`}>
                          {assignment.title}
                        </Link>
                      </h2>

                      {/* Due Date Indicator */}
                      <p className="text-xs text-[#7A6A5C] flex flex-wrap items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#C96B4B] shrink-0" />
                        <span>กำหนดส่ง:</span>
                        <strong className="text-[#3F342B]">
                          {formatThaiDateTime(assignment.dueDate)}
                        </strong>
                        {isPastDue && !isSubmitted && (
                          !assignment.allowLateSubmission ? (
                            <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-bold">
                              เลยกำหนดส่งแล้ว (ปิดรับแล้ว)
                            </span>
                          ) : assignment.lateDueDate && Date.now() > new Date(assignment.lateDueDate).getTime() ? (
                            <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-bold">
                              หมดเขตส่งล่าช้าแล้ว
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                              ส่งล่าช้าได้{assignment.lateDueDate ? ` (ถึง ${formatThaiDateTime(assignment.lateDueDate)})` : ""}
                            </span>
                          )
                        )}
                      </p>
                    </div>

                    {/* Status Badges */}
                    <div className="shrink-0 flex sm:flex-col items-end gap-1.5">
                      {isGraded ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-emerald-600" />
                          ได้คะแนน: {submission?.score} / {assignment.maxScore}
                        </span>
                      ) : isReturned ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1 animate-pulse">
                          <RotateCcw className="w-3.5 h-3.5 text-orange-700" />
                          ถูกตีกลับ (ต้องส่งใหม่)
                        </span>
                      ) : isDraft ? (
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1 ${
                            isPastDue
                              ? "bg-rose-100 text-rose-800 border-rose-300"
                              : "bg-amber-100 text-amber-900 border-amber-300"
                          }`}
                        >
                          <Edit3 className={`w-3.5 h-3.5 ${isPastDue ? "text-rose-700" : "text-amber-700"}`} />
                          {isPastDue ? "เลยกำหนด (แบบร่าง)" : "แบบร่าง (ยังไม่ส่ง)"}
                        </span>
                      ) : isLate ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                          ส่งล่าช้า (รอตรวจ)
                        </span>
                      ) : isSubmitted ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          ส่งแล้ว (รอตรวจ)
                        </span>
                      ) : isPastDue ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          เลยกำหนด
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          ค้างส่ง
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description Preview */}
                  <p className="text-xs sm:text-sm text-[#5A4D41] leading-relaxed line-clamp-2">
                    {assignment.description}
                  </p>

                  {/* Card Bottom Bar */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F2E8DC]">
                    <span className="text-xs text-[#7A6A5C] flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-[#D9A441]" />
                      <span>{assignment.rubricCount} เกณฑ์ประเมิน</span>
                    </span>

                    <Link
                      href={`/student/assignments/${assignment.id}`}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                        isReturned
                          ? "bg-[#B94E48] hover:bg-[#A33D37] text-white shadow-sm"
                          : isGraded
                          ? "bg-white border border-[#D9CABB] text-[#3F342B] hover:border-[#D9A441]"
                          : isDraft
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : isSubmitted
                          ? "bg-[#FAF6F0] border border-[#D9CABB] text-[#3F342B] hover:border-[#D9A441]"
                          : "bg-[#D9A441] text-white hover:bg-[#C28F30]"
                      }`}
                    >
                      {isReturned && <RotateCcw className="w-3.5 h-3.5 animate-spin-reverse" />}
                      <span>
                        {isReturned
                          ? "แก้ไขและส่งงานใหม่"
                          : isGraded
                          ? "ดูผลคะแนนและคำติชม"
                          : isDraft
                          ? "แก้ไขและส่งงาน"
                          : isSubmitted
                          ? "ดูผลงานที่ส่ง"
                          : "ส่งงานทันที"}
                      </span>
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
