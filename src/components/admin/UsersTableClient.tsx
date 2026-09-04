"use client";

import { useState } from "react";
import {
  Users,
  Shield,
  GraduationCap,
  Power,
  Edit2,
  Trash2,
  KeyRound,
  Search,
  UserPlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Sparkles,
  UserCheck,
  UserX,
  BookOpen,
  ClipboardCheck,
} from "lucide-react";
import { UserItem, EditUserModal } from "@/components/admin/EditUserModal";
import { CreateUserModal } from "@/components/admin/CreateUserModal";
import { ResetUserPasswordModal } from "@/components/admin/ResetUserPasswordModal";
import { TablePagination } from "@/components/ui/TablePagination";
import { SortOrder } from "@/components/ui/SortableTableHeader";
import { toggleUserStatusAction, deleteUserAction } from "@/actions/user";
import { showCozyConfirm, showCozySuccess, showCozyError } from "@/lib/ui/swal";

interface UsersTableClientProps {
  initialUsers: UserItem[];
  currentUserId: string;
  stats: {
    totalUsers: number;
    adminCount: number;
    studentCount: number;
    activeCount: number;
    inactiveCount: number;
  };
}

export function UsersTableClient({
  initialUsers,
  currentUserId,
  stats,
}: UsersTableClientProps) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "STUDENT">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Sorting & Pagination
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserItem | null>(null);

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

  // Filtering
  const filtered = users.filter((u) => {
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchStatus = statusFilter === "ALL" || u.status === statusFilter;

    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      (u.studentInfo &&
        (u.studentInfo.studentCode.toLowerCase().includes(q) ||
          u.studentInfo.className.toLowerCase().includes(q) ||
          u.studentInfo.studentNumber.toString() === q));

    return matchRole && matchStatus && matchSearch;
  });

  // Sorting
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

  // Status toggle handler
  const handleToggleStatus = async (user: UserItem) => {
    if (user.id === currentUserId) {
      await showCozyError("ไม่สามารถดำเนินการได้", "คุณไม่สามารถระงับการใช้งานบัญชีของตนเองได้");
      return;
    }

    const isActive = user.status === "ACTIVE";
    const actionText = isActive ? "ระงับการใช้งาน" : "เปิดใช้งานอีกครั้ง";

    const confirmed = await showCozyConfirm(
      `${actionText}บัญชีผู้ใช้?`,
      `คุณต้องการ${actionText} "${user.username}" ใช่หรือไม่?`
    );

    if (!confirmed.isConfirmed) return;

    try {
      const newStatus = isActive ? "INACTIVE" : "ACTIVE";
      const res = await toggleUserStatusAction(user.id, newStatus);

      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
        );
        await showCozySuccess("สำเร็จ!", res.message);
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    }
  };

  // Delete user handler
  const handleDeleteUser = async (user: UserItem) => {
    if (user.id === currentUserId) {
      await showCozyError("ไม่สามารถดำเนินการได้", "คุณไม่สามารถลบบัญชีที่คุณกำลังล็อกอินอยู่ได้");
      return;
    }

    const confirmed = await showCozyConfirm(
      "ยืนยันการลบบัญชีผู้ใช้?",
      `คุณต้องการลบบัญชี "${user.username}" ใช่หรือไม่? การกระทำนี้ไม่สามารถกู้คืนได้`
    );

    if (!confirmed.isConfirmed) return;

    try {
      const res = await deleteUserAction(user.id);

      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        await showCozySuccess("สำเร็จ!", res.message);
      } else {
        await showCozyError("ไม่สามารถลบผู้ใช้งานได้", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    }
  };

  const formatDateThai = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3F342B] tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#B94E48]" />
            จัดการบัญชีผู้ใช้งานระบบ (User Management)
          </h1>
          <p className="text-xs sm:text-sm text-[#7A6A5C]">
            ควบคุมดูแลบัญชีผู้ดูแลระบบ (Admin) ครูผู้สอน และบัญชีนักเรียนทั้งหมด
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#B94E48] hover:bg-[#A33F39] active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>เพิ่มผู้ใช้งานใหม่</span>
        </button>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EADBCC] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7A6A5C]">ผู้ใช้งานทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#3F342B]">
            {stats.totalUsers} <span className="text-xs font-medium text-[#7A6A5C]">บัญชี</span>
          </p>
        </div>

        {/* Admins */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EADBCC] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7A6A5C]">ผู้ดูแลระบบ / ครู</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#B94E48] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#B94E48]">
            {stats.adminCount} <span className="text-xs font-medium text-[#7A6A5C]">คน</span>
          </p>
        </div>

        {/* Students */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EADBCC] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7A6A5C]">นักเรียนในระบบ</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#8C5D23] flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#8C5D23]">
            {stats.studentCount} <span className="text-xs font-medium text-[#7A6A5C]">คน</span>
          </p>
        </div>

        {/* Inactive */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EADBCC] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7A6A5C]">ระงับการใช้งาน</span>
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-stone-600">
            {stats.inactiveCount} <span className="text-xs font-medium text-[#7A6A5C]">บัญชี</span>
          </p>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EADBCC] shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Role Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setRoleFilter("ALL");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                roleFilter === "ALL"
                  ? "bg-[#3F342B] text-white shadow-xs"
                  : "bg-[#FAF6F0] text-[#7A6A5C] border border-[#EADBCC] hover:bg-[#F2E8DC]"
              }`}
            >
              สิทธิ์ทั้งหมด ({users.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setRoleFilter("ADMIN");
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                roleFilter === "ADMIN"
                  ? "bg-[#B94E48] text-white shadow-xs"
                  : "bg-[#FAF6F0] text-[#7A6A5C] border border-[#EADBCC] hover:bg-[#F2E8DC]"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>แอดมิน ({users.filter((u) => u.role === "ADMIN").length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRoleFilter("STUDENT");
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                roleFilter === "STUDENT"
                  ? "bg-[#D9A441] text-white shadow-xs"
                  : "bg-[#FAF6F0] text-[#7A6A5C] border border-[#EADBCC] hover:bg-[#F2E8DC]"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>นักเรียน ({users.filter((u) => u.role === "STUDENT").length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#A8988B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหาชื่อผู้ใช้, นักเรียน..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
          </div>
        </div>

        {/* Status Filter & Sort Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F2E8DC]">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#7A6A5C] font-semibold text-[11px]">สถานะ:</span>
            {[
              { id: "ALL", label: "ทั้งหมด" },
              { id: "ACTIVE", label: "ปกติ (Active)" },
              { id: "INACTIVE", label: "ระงับ (Inactive)" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setStatusFilter(st.id as any);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === st.id
                    ? "bg-[#FAF0E1] text-[#8C5D23] border border-[#D9CABB]"
                    : "text-[#7A6A5C] hover:bg-[#FAF6F0]"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Sort Pills */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#7A6A5C] font-semibold text-[11px]">เรียงตาม:</span>
            {[
              { field: "createdAt", label: "วันที่สร้าง" },
              { field: "username", label: "ชื่อผู้ใช้" },
              { field: "role", label: "สิทธิ์" },
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
      </div>

      {/* 4. Users Table & Mobile Card List */}
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#F2E8DC] flex items-center justify-between">
          <h2 className="font-bold text-[#3F342B] text-sm sm:text-base flex items-center gap-2">
            <span>รายชื่อบัญชีผู้ใช้งาน</span>
            <span className="text-xs font-normal text-[#7A6A5C]">
              (พบ {sorted.length} บัญชี)
            </span>
          </h2>
          <span className="text-xs text-[#7A6A5C]">
            ใช้งานอยู่:{" "}
            <strong className="text-emerald-700">
              {users.filter((u) => u.status === "ACTIVE").length}
            </strong>{" "}
            บัญชี
          </span>
        </div>

        {sorted.length === 0 ? (
          <div className="p-12 text-center text-[#7A6A5C] text-xs sm:text-sm space-y-2">
            <Users className="w-8 h-8 text-[#D9CABB] mx-auto opacity-70" />
            <p className="font-semibold text-[#5A4D41]">ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา</p>
            <p className="text-[11px] text-[#A8988B]">
              ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองสิทธิ์และสถานะ
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF6F0] border-b border-[#EADBCC] text-[11px] font-bold text-[#7A6A5C]">
                    <th className="py-3 px-5">ผู้ใช้งาน</th>
                    <th className="py-3 px-4">สิทธิ์การใช้งาน</th>
                    <th className="py-3 px-4">ข้อมูลสังกัด / กิจกรรม</th>
                    <th className="py-3 px-4">สถานะ</th>
                    <th className="py-3 px-4">วันที่สร้าง</th>
                    <th className="py-3 px-5 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2E8DC] text-xs">
                  {paginated.map((user) => {
                    const isSelf = user.id === currentUserId;
                    const isActive = user.status === "ACTIVE";

                    return (
                      <tr
                        key={user.id}
                        className={`transition-colors ${
                          isActive
                            ? "hover:bg-[#FAF6F0]/60"
                            : "bg-stone-50/70 opacity-75"
                        }`}
                      >
                        {/* 1. User Info */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                                user.role === "ADMIN"
                                  ? "bg-red-50 text-[#B94E48] border-red-200"
                                  : "bg-[#FAF0E1] text-[#8C5D23] border-[#EADBCC]"
                              }`}
                            >
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-[#3F342B]">
                                  {user.username}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#D9A441]/20 text-[#8C5D23] border border-[#D9A441]/30">
                                    คุณ
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#7A6A5C] truncate max-w-[200px]">
                                {user.displayName}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Role */}
                        <td className="py-4 px-4">
                          {user.role === "ADMIN" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-[#B94E48] border border-red-200">
                              <Shield className="w-3 h-3" />
                              <span>แอดมิน / ครู</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-[#8C5D23] border border-amber-200">
                              <GraduationCap className="w-3 h-3" />
                              <span>นักเรียน</span>
                            </span>
                          )}
                        </td>

                        {/* 3. Details / Activities */}
                        <td className="py-4 px-4 text-[#5A4D41]">
                          {user.role === "ADMIN" ? (
                            <div className="space-y-0.5 text-[11px]">
                              <span className="text-[#7A6A5C] block">
                                สร้างงาน {user.counts.createdAssignments} ชิ้น • ตรวจ {user.counts.gradesGiven} ชิ้น
                              </span>
                              <span className="text-[10px] text-[#A8988B]">
                                เช็กชื่อ {user.counts.createdAttendanceSessions} ครั้ง
                              </span>
                            </div>
                          ) : user.studentInfo ? (
                            <div className="text-[11px]">
                              <span className="font-semibold text-[#3F342B]">
                                ห้อง {user.studentInfo.className}
                              </span>{" "}
                              <span className="text-[#7A6A5C]">
                                เลขที่ #{user.studentInfo.studentNumber}
                              </span>
                              <p className="text-[10px] text-[#A8988B]">
                                รหัส: {user.studentInfo.studentCode}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[#A8988B] text-[11px] italic">ไม่มีข้อมูลนักเรียน</span>
                          )}
                        </td>

                        {/* 4. Status */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-stone-200 text-stone-600 border-stone-300"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? "bg-emerald-500" : "bg-stone-400"
                              }`}
                            />
                            {isActive ? "ปกติ" : "ระงับใช้งาน"}
                          </span>
                        </td>

                        {/* 5. Created Date */}
                        <td className="py-4 px-4 text-[11px] text-[#7A6A5C]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#A8988B]" />
                            <span>{formatDateThai(user.createdAt)}</span>
                          </div>
                        </td>

                        {/* 6. Action Buttons */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Reset Password */}
                            <button
                              type="button"
                              onClick={() => setResetPasswordUser(user)}
                              className="p-2 rounded-xl border border-[#D9CABB] bg-white text-[#5A4D41] hover:border-[#D9A441] hover:text-[#D9A441] transition-colors cursor-pointer"
                              title="รีเซ็ตรหัสผ่าน"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => setEditingUser(user)}
                              className="p-2 rounded-xl border border-[#D9CABB] bg-white text-[#5A4D41] hover:border-[#D9A441] hover:text-[#D9A441] transition-colors cursor-pointer"
                              title="แก้ไขข้อมูลผู้ใช้"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle Status */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              disabled={isSelf}
                              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                                isSelf
                                  ? "opacity-30 cursor-not-allowed bg-stone-100 border-stone-200 text-stone-400"
                                  : isActive
                                  ? "bg-white border-[#D9CABB] text-stone-500 hover:text-amber-700 hover:bg-amber-50"
                                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                              }`}
                              title={
                                isSelf
                                  ? "ไม่สามารถระงับบัญชีตนเองได้"
                                  : isActive
                                  ? "ระงับการใช้งาน"
                                  : "เปิดใช้งานอีกครั้ง"
                              }
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete User */}
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              disabled={isSelf}
                              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                                isSelf
                                  ? "opacity-30 cursor-not-allowed bg-stone-100 border-stone-200 text-stone-400"
                                  : "bg-white border-[#D9CABB] text-stone-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                              }`}
                              title={
                                isSelf
                                  ? "ไม่สามารถลบบัญชีตนเองได้"
                                  : "ลบบัญชีผู้ใช้งาน"
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-[#F2E8DC]">
              {paginated.map((user) => {
                const isSelf = user.id === currentUserId;
                const isActive = user.status === "ACTIVE";

                return (
                  <div
                    key={user.id}
                    className={`p-4 space-y-3 transition-colors ${
                      isActive ? "bg-white" : "bg-stone-50/70 opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                            user.role === "ADMIN"
                              ? "bg-red-50 text-[#B94E48] border-red-200"
                              : "bg-[#FAF0E1] text-[#8C5D23] border-[#EADBCC]"
                          }`}
                        >
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm text-[#3F342B]">
                              {user.username}
                            </h3>
                            {isSelf && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#D9A441]/20 text-[#8C5D23] border border-[#D9A441]/30">
                                คุณ
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#7A6A5C]">{user.displayName}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {user.role === "ADMIN" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-[#B94E48] border border-red-200">
                            <Shield className="w-3 h-3" />
                            <span>แอดมิน</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-[#8C5D23] border border-amber-200">
                            <GraduationCap className="w-3 h-3" />
                            <span>นักเรียน</span>
                          </span>
                        )}

                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-stone-200 text-stone-600 border-stone-300"
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-stone-400"
                            }`}
                          />
                          {isActive ? "ปกติ" : "ระงับ"}
                        </span>
                      </div>
                    </div>

                    {/* Extra details on mobile */}
                    <div className="text-xs text-[#7A6A5C] bg-[#FAF6F0] p-2.5 rounded-xl border border-[#EADBCC] flex items-center justify-between">
                      {user.role === "ADMIN" ? (
                        <span>
                          สร้างงาน {user.counts.createdAssignments} • ตรวจ {user.counts.gradesGiven}
                        </span>
                      ) : user.studentInfo ? (
                        <span>
                          ห้อง {user.studentInfo.className} เลขที่ #{user.studentInfo.studentNumber}
                        </span>
                      ) : (
                        <span className="italic text-[#A8988B]">ไม่มีข้อมูลเพิ่มเติม</span>
                      )}
                      <span className="text-[10px] text-[#A8988B]">
                        {formatDateThai(user.createdAt)}
                      </span>
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setResetPasswordUser(user)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#D9CABB] bg-white text-xs font-semibold text-[#5A4D41] hover:text-[#D9A441]"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>รหัสผ่าน</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingUser(user)}
                        className="p-1.5 rounded-xl border border-[#D9CABB] bg-white text-[#5A4D41] hover:text-[#D9A441]"
                        title="แก้ไข"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        disabled={isSelf}
                        className={`p-1.5 rounded-xl border ${
                          isSelf
                            ? "opacity-30 cursor-not-allowed bg-stone-100 text-stone-400"
                            : isActive
                            ? "bg-white text-stone-600 hover:text-amber-700"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                        title={isActive ? "ระงับการใช้งาน" : "เปิดใช้งาน"}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user)}
                        disabled={isSelf}
                        className={`p-1.5 rounded-xl border ${
                          isSelf
                            ? "opacity-30 cursor-not-allowed bg-stone-100 text-stone-400"
                            : "bg-white text-stone-600 hover:text-red-600 hover:border-red-200"
                        }`}
                        title="ลบผู้ใช้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
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

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <EditUserModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        userToEdit={editingUser}
        currentUserId={currentUserId}
      />

      <ResetUserPasswordModal
        isOpen={!!resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
        user={resetPasswordUser}
      />
    </div>
  );
}
