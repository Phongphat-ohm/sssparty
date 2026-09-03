"use client";

import { useState } from "react";
import {
  Users,
  UserPlus,
  Edit2,
  BookOpen,
  Search,
  Power,
  GraduationCap,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { StudentModal, StudentData } from "@/components/admin/StudentModal";
import { ImportStudentsModal } from "@/components/admin/ImportStudentsModal";
import { TablePagination } from "@/components/ui/TablePagination";
import { SortOrder } from "@/components/ui/SortableTableHeader";
import { toggleStudentStatusAction } from "@/actions/student";
import { showCozyConfirm, showCozySuccess, showCozyError } from "@/lib/ui/swal";

interface StudentWithStats extends StudentData {
  totalSubmissions: number;
  gradedCount: number;
  totalScoreEarned: number;
  totalMaxScore: number;
}

interface StudentsTableClientProps {
  initialStudents: StudentWithStats[];
  classList: string[];
}

export function StudentsTableClient({
  initialStudents,
  classList,
}: StudentsTableClientProps) {
  const [students, setStudents] = useState<StudentWithStats[]>(initialStudents);
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null);

  // Sort & Pagination
  const [sortField, setSortField] = useState<string>("studentNumber");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const filtered = initialStudents.filter((s) => {
    const matchClass = selectedClass === "ALL" || s.className === selectedClass;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.studentCode.toLowerCase().includes(q) ||
      s.studentNumber.toString() === q;
    return matchClass && matchSearch;
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

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: StudentData) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (student: StudentWithStats) => {
    const isActive = student.status === "ACTIVE";
    const actionText = isActive ? "ระงับการใช้งาน" : "เปิดใช้งานอีกครั้ง";

    const confirmed = await showCozyConfirm(
      `${actionText}บัญชีนักเรียน?`,
      `คุณต้องการ${actionText} "${student.firstName} ${student.lastName}" ใช่หรือไม่?`
    );

    if (!confirmed.isConfirmed) return;

    try {
      const res = await toggleStudentStatusAction(
        student.id,
        isActive ? "INACTIVE" : "ACTIVE"
      );

      if (res.success) {
        setStudents((prev) =>
          prev.map((s) =>
            s.id === student.id
              ? { ...s, status: isActive ? "INACTIVE" : "ACTIVE" }
              : s
          )
        );
        await showCozySuccess("สำเร็จ!", res.message);
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    }
  };

  const totalActive = initialStudents.filter((s) => s.status === "ACTIVE").length;

  return (
    <div className="space-y-5">
      {/* Header Bar with Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3F342B] tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#B94E48]" />
            รายชื่อสมาชิกชุมนุมสื่อสร้างสรรค์
          </h1>
          <p className="text-xs sm:text-sm text-[#7A6A5C]">
            จัดการข้อมูลนักเรียน ตรวจสอบการส่งงาน และคะแนนสะสม
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs text-[#5A4D41] bg-white border border-[#D9CABB] hover:border-[#D9A441] hover:text-[#D9A441] active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#D9A441]" />
            <span>นำเข้าข้อมูล (Import CSV)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#D9A441] hover:bg-[#C28F30] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>เพิ่มนักเรียนใหม่</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Class Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setSelectedClass("ALL");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedClass === "ALL"
                ? "bg-[#3F342B] text-white shadow-xs"
                : "bg-[#FAF6F0] text-[#7A6A5C] border border-[#EADBCC] hover:bg-[#F2E8DC]"
            }`}
          >
            ทุกห้อง ({initialStudents.length})
          </button>
          {classList.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => {
                setSelectedClass(cls);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedClass === cls
                  ? "bg-[#B94E48] text-white shadow-xs"
                  : "bg-[#FAF6F0] text-[#7A6A5C] border border-[#EADBCC] hover:bg-[#F2E8DC]"
              }`}
            >
              {cls} ({initialStudents.filter((s) => s.className === cls).length})
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#A8988B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="ค้นหาชื่อ หรือรหัสนักเรียน..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
          />
        </div>
      </div>

      {/* Sorting Quick Pills */}
      <div className="flex flex-wrap items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-[#EADBCC] shadow-2xs text-xs">
        <span className="text-[#7A6A5C] font-semibold text-[11px]">เรียงลำดับตาม:</span>
        {[
          { field: "studentNumber", label: "เลขที่" },
          { field: "studentCode", label: "รหัสนักเรียน" },
          { field: "firstName", label: "ชื่อจริง" },
          { field: "totalScoreEarned", label: "คะแนนสะสม" },
          { field: "totalSubmissions", label: "จำนวนงานที่ส่ง" },
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

      {/* Students List */}
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#F2E8DC] flex items-center justify-between">
          <h2 className="font-bold text-[#3F342B] text-sm sm:text-base">
            สมาชิกชุมนุม ({sorted.length} คน)
          </h2>
          <span className="text-xs text-[#7A6A5C]">
            ใช้งานอยู่: <strong className="text-emerald-700">{totalActive}</strong> คน
          </span>
        </div>

        {sorted.length === 0 ? (
          <div className="p-12 text-center text-[#7A6A5C] text-xs sm:text-sm">
            ไม่พบข้อมูลนักเรียนที่ตรงกับคำค้นหา
          </div>
        ) : (
          <div>
            <div className="divide-y divide-[#F2E8DC]">
              {paginated.map((student) => {
                const isActive = student.status === "ACTIVE";

                return (
                  <div
                    key={student.id}
                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                      isActive ? "hover:bg-[#FAF6F0]/60" : "bg-stone-50/70 opacity-75"
                    }`}
                  >
                    {/* Left: Info */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl font-bold text-xs flex items-center justify-center border shrink-0 ${
                          isActive
                            ? "bg-[#FAF0E1] text-[#8C5D23] border-[#EADBCC]"
                            : "bg-stone-200 text-stone-600 border-stone-300"
                        }`}
                      >
                        #{student.studentNumber}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-[#3F342B]">
                            {student.firstName} {student.lastName}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-stone-200 text-stone-600 border-stone-300"
                            }`}
                          >
                            {isActive ? "ปกติ" : "ระงับการใช้งาน"}
                          </span>
                        </div>
                        <p className="text-xs text-[#7A6A5C] flex items-center gap-2 mt-0.5">
                          <span className="font-medium">รหัส: {student.studentCode}</span>
                          <span>•</span>
                          <span className="font-semibold text-[#8C5D23]">
                            ห้อง {student.className}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Middle: Stats */}
                    <div className="flex items-center gap-6 sm:gap-8 text-xs self-start sm:self-auto pl-13 sm:pl-0">
                      <div>
                        <span className="text-[10px] text-[#7A6A5C] block">ส่งงานแล้ว</span>
                        <span className="font-bold text-[#3F342B] flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-[#D9A441]" />
                          {student.totalSubmissions} ชิ้น
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#7A6A5C] block">คะแนนรวมสะสม</span>
                        <span className="font-bold text-[#B94E48]">
                          {student.totalScoreEarned} คะแนน
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(student)}
                        className="p-2 rounded-xl border border-[#D9CABB] bg-white text-[#5A4D41] hover:border-[#D9A441] hover:text-[#D9A441] transition-colors cursor-pointer"
                        title="แก้ไขข้อมูลนักเรียน"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(student)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          isActive
                            ? "bg-white border-[#D9CABB] text-stone-500 hover:text-red-600 hover:bg-red-50"
                            : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                        }`}
                        title={isActive ? "ระงับการใช้งาน" : "เปิดใช้งานอีกครั้ง"}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
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

      {/* Modal for Add / Edit */}
      <StudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studentToEdit={editingStudent}
      />

      {/* Modal for CSV Import */}
      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
