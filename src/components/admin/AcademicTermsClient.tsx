"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  Trash2,
  Edit,
  Eye,
  Search,
  AlertCircle,
  Clock,
  Layers,
  FileText,
  BookOpen,
  Calendar,
  Sparkles,
  ShieldAlert,
  Loader2,
  ChevronDown,
  EyeOff,
  AlertTriangle,
  X,
  RotateCcw,
} from "lucide-react";
import {
  AcademicTermWithStats,
  getCurrentSystemTerm,
} from "@/lib/terms/term-service";
import { ActionDropdown } from "@/components/ui/ActionDropdown";
import {
  createAcademicTermAction,
  updateAcademicTermAction,
  toggleTermLockAction,
  setSystemActiveTermAction,
  deleteAcademicTermAction,
  switchAdminTermAction,
  getAcademicTermsListAction,
} from "@/actions/term";
import { showCozySuccess, showCozyError, showCozyConfirm } from "@/lib/ui/swal";
import { formatThaiDate } from "@/lib/utils/date-thai";

interface AcademicTermsClientProps {
  initialTerms: AcademicTermWithStats[];
  canManageSettings: boolean;
}

export function AcademicTermsClient({
  initialTerms,
  canManageSettings,
}: AcademicTermsClientProps) {
  const router = useRouter();
  const [terms, setTerms] = useState<AcademicTermWithStats[]>(initialTerms);
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync state when server revalidates initialTerms
  useEffect(() => {
    setTerms(initialTerms);
  }, [initialTerms]);

  // Fetch latest terms data from server directly
  const refreshTerms = async () => {
    setIsRefreshing(true);
    try {
      const res = await getAcademicTermsListAction();
      if (res.success && Array.isArray(res.data)) {
        setTerms(res.data);
      }
    } catch (err) {
      console.error("Error refreshing terms list:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTermWithStats | null>(null);

  // Form States (Create)
  const [createTermCode, setCreateTermCode] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createIsCurrent, setCreateIsCurrent] = useState(false);
  const [createIsLocked, setCreateIsLocked] = useState(false);

  // Form States (Edit)
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsLocked, setEditIsLocked] = useState(false);

  // Delete Modal States
  const [deletingTerm, setDeletingTerm] = useState<AcademicTermWithStats | null>(null);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState("");
  const [deleteAdminPassword, setDeleteAdminPassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active Dropdown Action Row ID
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Filtered terms
  const filteredTerms = terms.filter(
    (t) =>
      t.termCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalTerms = terms.length;
  const currentTermObj = terms.find((t) => t.isCurrent);
  const lockedCount = terms.filter((t) => t.isLocked).length;

  // Handler: Open Create Modal
  const handleOpenCreateModal = () => {
    // Auto-predict next termCode
    setCreateTermCode("");
    setCreateName("");
    setCreateDescription("");
    setCreateIsCurrent(false);
    setCreateIsLocked(false);
    setIsCreateModalOpen(true);
  };

  // Handler: Auto-fill name when termCode changes
  const handleTermCodeChange = (code: string) => {
    setCreateTermCode(code);
    if (code.includes("/")) {
      const [termNum, year] = code.split("/");
      if (termNum && year) {
        setCreateName(`ภาคเรียนที่ ${termNum} ปีการศึกษา ${year}`);
      }
    }
  };

  // Handler: Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("termCode", createTermCode);
      formData.set("name", createName);
      formData.set("description", createDescription);
      formData.set("isCurrent", String(createIsCurrent));
      formData.set("isLocked", String(createIsLocked));

      const res = await createAcademicTermAction(formData);
      if (res.success) {
        await showCozySuccess("สำเร็จ!", res.message);
        setIsCreateModalOpen(false);
        await refreshTerms();
        router.refresh();
      } else {
        await showCozyError("ไม่สามารถสร้างได้", res.message);
      }
    });
  };

  // Handler: Open Edit Modal
  const handleOpenEditModal = (term: AcademicTermWithStats) => {
    setEditingTerm(term);
    setEditName(term.name);
    setEditDescription(term.description || "");
    setEditIsLocked(term.isLocked);
    setIsEditModalOpen(true);
  };

  // Handler: Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTerm || !canManageSettings) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", editName);
      formData.set("description", editDescription);
      formData.set("isLocked", String(editIsLocked));

      const res = await updateAcademicTermAction(editingTerm.id, formData);
      if (res.success) {
        // อัปเดตข้อมูลในตารางทันทีแบบ Real-time
        setTerms((prev) =>
          prev.map((t) =>
            t.id === editingTerm.id
              ? {
                  ...t,
                  name: editName.trim(),
                  description: editDescription.trim() || null,
                  isLocked: editIsLocked,
                }
              : t
          )
        );
        await showCozySuccess("สำเร็จ!", res.message);
        setIsEditModalOpen(false);
        // ดึงข้อมูลเวอร์ชันล่าสุดจากฐานข้อมูลมาซิงก์ครบถ้วน
        await refreshTerms();
        router.refresh();
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message);
      }
    });
  };

  // Handler: Toggle Lock
  const handleToggleLock = async (term: AcademicTermWithStats) => {
    if (!canManageSettings) return;

    const actionText = term.isLocked ? "ปลดล็อก" : "ล็อก";
    const confirmDesc = term.isLocked
      ? `คุณต้องการปลดล็อกภาคเรียน ${term.termCode} หรือไม่? (หลังจากปลดล็อก ครูผู้สอนจะสามารถเพิ่ม/แก้ไขข้อมูลในเทอมนี้ได้)`
      : `คุณต้องการล็อกภาคเรียน ${term.termCode} หรือไม่? (เมื่อล็อกแล้ว ครูผู้สอนทั่วไปจะไม่สามารถเพิ่มหรือแก้ไขข้อมูลในเทอมนี้ได้ เพื่อป้องกันข้อมูลประวัติคลาดเคลื่อน)`;

    const confirmRes = await showCozyConfirm({
      title: `ยืนยันการ${actionText}ภาคเรียน?`,
      text: confirmDesc,
      confirmText: term.isLocked ? "ปลดล็อกภาคเรียน" : "ล็อกภาคเรียน",
    });

    if (!confirmRes.isConfirmed) return;

    startTransition(async () => {
      const res = await toggleTermLockAction(term.id, !term.isLocked);
      if (res.success) {
        // อัปเดตสถานะล็อกในตารางทันที
        setTerms((prev) =>
          prev.map((t) =>
            t.id === term.id ? { ...t, isLocked: !term.isLocked } : t
          )
        );
        await showCozySuccess("สำเร็จ!", res.message);
        await refreshTerms();
        router.refresh();
      } else {
        await showCozyError("ไม่สามารถดำเนินการได้", res.message);
      }
    });
  };

  // Handler: Set as Active System Term
  const handleSetActive = async (term: AcademicTermWithStats) => {
    if (!canManageSettings || term.isCurrent) return;

    const confirmRes = await showCozyConfirm({
      title: `ตั้งเป็นภาคเรียนปัจจุบันของระบบ?`,
      text: `เมื่อตั้งเป็นเทอมปัจจุบัน นักเรียนทุกคนจะเห็นการบ้านและรอบเช็กชื่อของภาคเรียน "${term.termCode}" นี้โดยอัตโนมัติ`,
      confirmText: "ยืนยันตั้งเป็นเทอมปัจจุบัน",
    });

    if (!confirmRes.isConfirmed) return;

    startTransition(async () => {
      const res = await setSystemActiveTermAction(term.id);
      if (res.success) {
        await showCozySuccess("สำเร็จ!", res.message);
        router.refresh();
        await refreshTerms();
      } else {
        await showCozyError("ไม่สามารถเปลี่ยนได้", res.message);
      }
    });
  };

  // Handler: Switch View to this Term
  const handleSwitchView = async (termCode: string) => {
    try {
      const res = await fetch("/api/terms/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: termCode }),
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
        await refreshTerms();
      } else {
        await showCozyError("ไม่สามารถสลับภาคเรียนได้", data.message);
      }
    } catch {
      router.refresh();
      await refreshTerms();
    }
  };

  // Handler: Open Delete Modal
  const handleOpenDeleteModal = (term: AcademicTermWithStats) => {
    if (!canManageSettings) return;
    if (term.isCurrent) {
      showCozyError(
        "ไม่สามารถลบได้",
        "ไม่สามารถลบภาคเรียนที่เป็นเทอมปัจจุบันของระบบได้ กรุณาสลับเทอมอื่นเป็นเทอมปัจจุบันก่อน"
      );
      return;
    }
    setDeletingTerm(term);
    setDeleteConfirmCode("");
    setDeleteAdminPassword("");
    setShowDeletePassword(false);
  };

  // Handler: Submit Delete
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingTerm || !canManageSettings) return;

    if (deleteConfirmCode.trim() !== deletingTerm.termCode) {
      await showCozyError(
        "รหัสไม่ตรงกัน",
        `กรุณาพิมพ์รหัสภาคเรียน "${deletingTerm.termCode}" ให้ถูกต้อง`
      );
      return;
    }

    if (!deleteAdminPassword.trim()) {
      await showCozyError(
        "กรุณากรอกรหัสผ่าน",
        "กรุณากรอกรหัสผ่านบัญชีผู้ดูแลระบบเพื่อยืนยันการลบ"
      );
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteAcademicTermAction(
        deletingTerm.id,
        deleteConfirmCode.trim(),
        deleteAdminPassword.trim()
      );
      if (res.success) {
        await showCozySuccess("ลบเรียบร้อยแล้ว", res.message);
        setDeletingTerm(null);
        router.refresh();
        await refreshTerms();
      } else {
        await showCozyError("ไม่สามารถลบได้", res.message);
      }
    } catch (err: any) {
      await showCozyError(
        "เกิดข้อผิดพลาด",
        err?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-6xl w-full mx-auto animate-in fade-in duration-150">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#3F342B] tracking-tight flex items-center gap-2">
              <span>จัดการภาคเรียน (Academic Terms)</span>
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF0E1] text-[#8C5D23] border border-[#EADBCC]">
              {totalTerms} เทอมในระบบ
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#7A6A5C] mt-1">
            กำหนดภาคเรียนปัจจุบันของระบบ ควบคุมการล็อกข้อมูล และแยกส่วนข้อมูลการบ้านและการเช็กชื่อ
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={refreshTerms}
            disabled={isRefreshing || isPending}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-[#FAF6F0] text-[#5A4D41] border border-[#D9CABB] text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="ดึงข้อมูลภาคเรียนล่าสุดมาแสดงในตาราง"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-[#D9A441] ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}</span>
          </button>

          {canManageSettings && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#B94E48] hover:bg-[#A33F39] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มภาคเรียนใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Permission Notice if cannot manage */}
      {!canManageSettings && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3 text-xs text-amber-800">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            คุณกำลังดูข้อมูลภาคเรียนในโหมดอ่านอย่างเดียว (View-only) เฉพาะผู้ดูแลระบบที่มีสิทธิ์{" "}
            <strong>MANAGE_SETTINGS</strong> หรือ <strong>SUPER_ADMIN</strong> เท่านั้นที่สามารถสร้าง ล็อก หรือเปลี่ยนเทอมปัจจุบันได้
          </span>
        </div>
      )}

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-[#EADBCC] shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#7A6A5C] font-medium">ภาคเรียนปัจจุบันของระบบ</span>
            <div className="text-lg font-bold text-[#3F342B] flex items-center gap-2 mt-0.5">
              <span>{currentTermObj ? currentTermObj.termCode : "ยังไม่ระบุ"}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                Active
              </span>
            </div>
            <p className="text-[11px] text-[#A89887] truncate max-w-[200px]">
              {currentTermObj?.name}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EADBCC] shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#7A6A5C] font-medium">เทอมที่ล็อกห้ามแก้ไข</span>
            <div className="text-lg font-bold text-[#3F342B] mt-0.5">
              <span>{lockedCount}</span>
              <span className="text-xs text-[#7A6A5C] font-normal ml-1.5">ภาคเรียน</span>
            </div>
            <p className="text-[11px] text-[#A89887]">
              ข้อมูลประวัติถูกป้องกันการเปลี่ยนแปลง
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EADBCC] shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#7A6A5C] font-medium">จำนวนภาคเรียนทั้งหมด</span>
            <div className="text-lg font-bold text-[#3F342B] mt-0.5">
              <span>{totalTerms}</span>
              <span className="text-xs text-[#7A6A5C] font-normal ml-1.5">ภาคเรียน</span>
            </div>
            <p className="text-[11px] text-[#A89887]">
              แยกการบ้าน เช็กชื่อ และสมุดคะแนน
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-3 border border-[#EADBCC] shadow-2xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#A89887] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="ค้นหาตามรหัสเทอม (เช่น 1/2569) หรือชื่อภาคเรียน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-[#EADBCC] focus:outline-none focus:border-[#D9A441] bg-[#FAF6F0]"
          />
        </div>
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-xs text-[#7A6A5C] hover:text-[#B94E48] font-semibold px-2 cursor-pointer"
          >
            ล้างค้นหา
          </button>
        )}
      </div>

      {/* 4. Terms Table */}
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EADBCC] bg-[#FAF6F0]/80 text-[11px] font-bold text-[#7A6A5C] uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">รหัส / ภาคเรียน</th>
                <th className="py-3.5 px-4">สถานะระบบ</th>
                <th className="py-3.5 px-4">การแก้ไข (Lock)</th>
                <th className="py-3.5 px-4 hidden md:table-cell">ข้อมูลที่ผูกอยู่</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">สร้างเมื่อ</th>
                <th className="py-3.5 px-4 text-right">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E8DC] text-xs text-[#3F342B]">
              {filteredTerms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#7A6A5C]">
                    <Layers className="w-8 h-8 text-[#D9CABB] mx-auto mb-2" />
                    <p className="font-semibold">ไม่พบข้อมูลภาคเรียน</p>
                    <p className="text-[11px] text-[#A89887] mt-0.5">
                      ลองค้นหาด้วยคำอื่น หรือกดปุ่ม "เพิ่มภาคเรียนใหม่"
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTerms.map((term) => (
                  <tr
                    key={term.id}
                    className={`hover:bg-[#FFFDF9] transition-colors ${
                      term.isCurrent ? "bg-emerald-50/30" : ""
                    }`}
                  >
                    {/* Term Code & Name */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            term.isCurrent
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-[#FAF0E1] text-[#A26D14] border border-[#EADBCC]"
                          }`}
                        >
                          {term.termCode}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#3F342B]">{term.name}</span>
                          </div>
                          {term.description && (
                            <p className="text-[11px] text-[#7A6A5C] line-clamp-1">
                              {term.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Active System Term Status */}
                    <td className="py-3.5 px-4">
                      {term.isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>เทอมปัจจุบัน</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#7A6A5C] font-medium">
                          เทอมย้อนหลัง
                        </span>
                      )}
                    </td>

                    {/* Lock Status */}
                    <td className="py-3.5 px-4">
                      {term.isLocked ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                          title="เทอมนี้ถูกล็อก ครูผู้สอนทั่วไปไม่สามารถสร้างหรือแก้ไขงานได้"
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-700" />
                          <span>ล็อกห้ามแก้ไข</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                          title="เทอมนี้เปิดให้ครูผู้สอนเพิ่มและแก้ไขข้อมูลได้"
                        >
                          <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                          <span>เปิดให้แก้ไข</span>
                        </span>
                      )}
                    </td>

                    {/* Associated Data Counts */}
                    <td className="py-3.5 px-4 hidden md:table-cell">
                      <div className="flex items-center gap-3 text-[11px] text-[#5A4D41]">
                        <span title="จำนวนการบ้าน" className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-[#B94E48]" />
                          <span>{term.assignmentsCount}</span>
                        </span>
                        <span>•</span>
                        <span title="จำนวนรอบเช็กชื่อ" className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#D9A441]" />
                          <span>{term.sessionsCount}</span>
                        </span>
                        <span>•</span>
                        <span title="จำนวนรายงานที่ออก" className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-blue-600" />
                          <span>{term.reportsCount}</span>
                        </span>
                      </div>
                    </td>

                    {/* Created At */}
                    <td className="py-3.5 px-4 hidden lg:table-cell text-[11px] text-[#7A6A5C]">
                      {formatThaiDate(term.createdAt)}
                    </td>

                    {/* Action Dropdown using Portal (No overflow cut) */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end">
                        <ActionDropdown
                          align="right"
                          triggerVariant="button"
                          label="จัดการ"
                          size="sm"
                          groups={[
                            {
                              title: "การแสดงผล",
                              items: [
                                {
                                  label: "สลับไปดูข้อมูลเทอมนี้",
                                  icon: Eye,
                                  onClick: () => handleSwitchView(term.termCode),
                                },
                                ...(!term.isCurrent && canManageSettings
                                  ? [
                                      {
                                        label: "ตั้งเป็นเทอมปัจจุบันระบบ",
                                        icon: CheckCircle2,
                                        variant: "success" as const,
                                        onClick: () => handleSetActive(term),
                                      },
                                    ]
                                  : []),
                              ],
                            },
                            ...(canManageSettings
                              ? [
                                  {
                                    title: "การควบคุมภาคเรียน",
                                    items: [
                                      {
                                        label: term.isLocked
                                          ? "ปลดล็อกภาคเรียน"
                                          : "ล็อกภาคเรียน (ห้ามแก้)",
                                        icon: term.isLocked ? Unlock : Lock,
                                        variant: (term.isLocked ? "success" : "warning") as any,
                                        onClick: () => handleToggleLock(term),
                                      },
                                      {
                                        label: "แก้ไขชื่อ / รายละเอียด",
                                        icon: Edit,
                                        onClick: () => handleOpenEditModal(term),
                                      },
                                      ...(!term.isCurrent
                                        ? [
                                            {
                                              label: "ลบภาคเรียนนี้",
                                              icon: Trash2,
                                              variant: "danger" as const,
                                              onClick: () => handleOpenDeleteModal(term),
                                            },
                                          ]
                                        : []),
                                    ],
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. CREATE TERM MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-[#A26D14] flex items-center justify-center font-bold">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-[#3F342B]">เพิ่มภาคเรียนใหม่</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#3F342B] block mb-1">
                  รหัสภาคเรียน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 1/2569 หรือ 2/2569"
                  value={createTermCode}
                  onChange={(e) => handleTermCodeChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EADBCC] focus:outline-none focus:border-[#D9A441] bg-[#FAF6F0]"
                />
                <span className="text-[10px] text-[#7A6A5C]">
                  ใช้เป็นตัวระบุข้อมูลในระบบ เช่น 1/2569
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-[#3F342B] block mb-1">
                  ชื่อภาคเรียน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ภาคเรียนที่ 1 ปีการศึกษา 2569"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EADBCC] focus:outline-none focus:border-[#D9A441] bg-[#FAF6F0]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#3F342B] block mb-1">
                  คำอธิบายเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ภาคเรียนปกติ จัดกิจกรรมชุมนุมทุกวันพุธ"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EADBCC] focus:outline-none focus:border-[#D9A441] bg-[#FAF6F0]"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-[#F2E8DC]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createIsCurrent}
                    onChange={(e) => setCreateIsCurrent(e.target.checked)}
                    className="rounded text-[#B94E48] focus:ring-[#B94E48] w-4 h-4"
                  />
                  <span className="text-xs text-[#3F342B] font-semibold">
                    กำหนดเป็นภาคเรียนปัจจุบันของระบบทันที (Active)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createIsLocked}
                    onChange={(e) => setCreateIsLocked(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-600 w-4 h-4"
                  />
                  <span className="text-xs text-[#3F342B] font-semibold">
                    ล็อกภาคเรียนนี้ทันที (ห้ามครูผู้สอนเพิ่ม/แก้ไขงาน)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7A6A5C] hover:bg-[#FAF6F0] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending || !createTermCode || !createName}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#B94E48] hover:bg-[#A33F39] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>บันทึกภาคเรียน</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. EDIT TERM MODAL */}
      {isEditModalOpen && editingTerm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <Edit className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-[#3F342B]">
                  แก้ไขภาคเรียน {editingTerm.termCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#3F342B] block mb-1">
                  รหัสภาคเรียน
                </label>
                <input
                  type="text"
                  disabled
                  value={editingTerm.termCode}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EADBCC] bg-[#F2E8DC] text-[#7A6A5C] cursor-not-allowed font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#3F342B] block mb-1">
                  ชื่อภาคเรียน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EADBCC] focus:outline-none focus:border-[#D9A441] bg-[#FAF6F0]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#3F342B] block mb-1">
                  คำอธิบายเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EADBCC] focus:outline-none focus:border-[#D9A441] bg-[#FAF6F0]"
                />
              </div>

              <div className="pt-2 border-t border-[#F2E8DC]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsLocked}
                    onChange={(e) => setEditIsLocked(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-600 w-4 h-4"
                  />
                  <span className="text-xs text-[#3F342B] font-semibold">
                    ล็อกภาคเรียนนี้ (ห้ามครูผู้สอนเพิ่ม/แก้ไขงาน)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7A6A5C] hover:bg-[#FAF6F0] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending || !editName}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. HIGH-SECURITY DELETE TERM MODAL */}
      {deletingTerm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#3F342B]">
                    ลบภาคเรียน {deletingTerm.termCode}
                  </h3>
                  <p className="text-xs text-rose-600 font-medium">
                    การลบนี้จะทำลายข้อมูลที่เกี่ยวข้องทั้งหมดอย่างถาวร
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setDeletingTerm(null)}
                disabled={isDeleting}
                className="text-[#7A6A5C] hover:text-[#3F342B] p-1 rounded-lg hover:bg-rose-50 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Box & Stats Breakdown */}
            <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-2.5 text-xs text-rose-950">
              <div className="font-semibold flex items-center gap-1.5 text-rose-700">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>ข้อมูลต่อไปนี้ที่ผูกกับภาคเรียนนี้จะถูกลบทิ้งถาวรทั้งหมด:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-medium pt-1">
                <div className="bg-white/80 p-2 rounded-xl border border-rose-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>การบ้าน: <strong>{deletingTerm.assignmentsCount}</strong> รายการ</span>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-rose-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>รอบเช็กชื่อ: <strong>{deletingTerm.sessionsCount}</strong> รอบ</span>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-rose-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>รายงาน: <strong>{deletingTerm.reportsCount}</strong> ฉบับ</span>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-rose-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>งานที่ส่ง & คะแนน: <strong>ทั้งหมด</strong></span>
                </div>
              </div>
              <p className="text-[10px] text-rose-600/90 leading-tight">
                * ไฟล์แนบทั้งหมดและไฟล์งานของนักเรียนบน Cloud S3 จะถูกลบถาวร ไม่สามารถกู้คืนได้
              </p>
            </div>

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              {/* Confirm Term Code Input */}
              <div>
                <label className="text-xs font-bold text-[#3F342B] block mb-1">
                  1. พิมพ์รหัสภาคเรียน <span className="text-rose-600 underline font-mono select-all">{deletingTerm.termCode}</span> เพื่อยืนยัน
                </label>
                <input
                  type="text"
                  required
                  disabled={isDeleting}
                  value={deleteConfirmCode}
                  onChange={(e) => setDeleteConfirmCode(e.target.value)}
                  placeholder={`พิมพ์ "${deletingTerm.termCode}" ให้ตรงเป๊ะ`}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EADBCC] focus:outline-none focus:border-rose-500 bg-[#FAF6F0] font-mono tracking-wider"
                />
              </div>

              {/* Admin Password Input */}
              <div>
                <label className="text-xs font-bold text-[#3F342B] block mb-1">
                  2. รหัสผ่านบัญชีผู้ดูแลระบบ (Admin Password)
                </label>
                <div className="relative">
                  <input
                    type={showDeletePassword ? "text" : "password"}
                    required
                    disabled={isDeleting}
                    value={deleteAdminPassword}
                    onChange={(e) => setDeleteAdminPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านของคุณเพื่อยืนยันสิทธิ์"
                    className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-[#EADBCC] focus:outline-none focus:border-rose-500 bg-[#FAF6F0]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A6A5C] hover:text-[#3F342B] p-1 cursor-pointer"
                  >
                    {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F2E8DC]">
                <button
                  type="button"
                  onClick={() => setDeletingTerm(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7A6A5C] hover:bg-[#FAF6F0] cursor-pointer disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={
                    isDeleting ||
                    deleteConfirmCode.trim() !== deletingTerm.termCode ||
                    !deleteAdminPassword.trim()
                  }
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังลบข้อมูลทั้งหมด...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ยืนยันลบภาคเรียนและข้อมูลทั้งหมด</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
