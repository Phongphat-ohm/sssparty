"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Edit2, Save, Loader2, Shield, GraduationCap, AlertCircle, CheckSquare, ShieldCheck } from "lucide-react";
import { updateUserAction } from "@/actions/user";
import { showCozySuccess, showCozyError } from "@/lib/ui/swal";
import {
  AdminRoleType,
  AdminPermissionType,
  ADMIN_PERMISSIONS_LIST,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS,
} from "@/lib/auth/permissions";

export interface UserItem {
  id: string;
  username: string;
  role: "ADMIN" | "STUDENT";
  adminRole?: AdminRoleType | null;
  permissions?: AdminPermissionType[];
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  hasPassword: boolean;
  displayName: string;
  studentInfo?: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
    className: string;
    studentNumber: number;
  } | null;
  counts: {
    createdAssignments: number;
    gradesGiven: number;
    createdAttendanceSessions: number;
  };
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: UserItem | null;
  currentUserId: string;
  currentUserRole?: AdminRoleType | null;
}

export function EditUserModal({
  isOpen,
  onClose,
  userToEdit,
  currentUserId,
  currentUserRole = "SUPER_ADMIN",
}: EditUserModalProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedRole, setSelectedRole] = useState<"ADMIN" | "STUDENT">(
    userToEdit?.role || "ADMIN"
  );
  const [selectedAdminRole, setSelectedAdminRole] = useState<AdminRoleType>(
    userToEdit?.adminRole || "TEACHER"
  );
  const [selectedPermissions, setSelectedPermissions] = useState<AdminPermissionType[]>(
    userToEdit?.permissions && userToEdit.permissions.length > 0
      ? userToEdit.permissions
      : ROLE_DEFAULT_PERMISSIONS[userToEdit?.adminRole || "TEACHER"] || []
  );

  if (!isOpen || !userToEdit) return null;

  const isSelf = userToEdit.id === currentUserId;
  const isTargetSuperAdmin = userToEdit.adminRole === "SUPER_ADMIN";
  const canEditSuperAdmin = currentUserRole === "SUPER_ADMIN";

  const handleAdminRoleChange = (role: AdminRoleType) => {
    setSelectedAdminRole(role);
    if (role !== "CUSTOM") {
      setSelectedPermissions(ROLE_DEFAULT_PERMISSIONS[role] || []);
    }
  };

  const handleTogglePermission = (perm: AdminPermissionType) => {
    if (selectedAdminRole !== "CUSTOM") {
      // เมื่อผู้ใช้ติ๊กแก้ permission ให้สลับโหมดเป็น CUSTOM อัตโนมัติ
      setSelectedAdminRole("CUSTOM");
    }
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);

    if (isSelf) {
      formData.set("role", userToEdit.role);
      formData.set("status", userToEdit.status);
    }

    if (selectedRole === "ADMIN") {
      formData.set("adminRole", selectedAdminRole);
      // แนบรายการ permissions ที่เลือก
      formData.delete("permissions");
      selectedPermissions.forEach((p) => formData.append("permissions", p));
    }

    try {
      const res = await updateUserAction(userToEdit.id, formData);

      if (!res.success) {
        setErrorMsg(res.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
        setIsPending(false);
        return;
      }

      await showCozySuccess("สำเร็จ!", res.message);
      onClose();
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="p-5 border-b border-[#F2E8DC] flex items-center justify-between bg-[#FFF9F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center border border-[#EADBCC]">
              <ShieldCheck className="w-5 h-5 text-[#B94E48]" />
            </div>
            <div>
              <h3 className="font-bold text-[#3F342B] text-base leading-tight">
                กำหนดสิทธิ์ & ข้อมูลผู้ใช้งาน
              </h3>
              <p className="text-[11px] text-[#7A6A5C]">
                บัญชี: <span className="font-bold text-[#3F342B]">{userToEdit.username}</span>
                {isSelf && " (บัญชีของคุณ)"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A6A5C] hover:bg-[#FAF6F0] hover:text-[#3F342B] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-[#B94E48] rounded-xl text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          {isSelf && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                คุณกำลังแก้ไขบัญชีของตนเอง จึงไม่สามารถเปลี่ยนระดับสิทธิ์หรือระงับสถานะบัญชีได้
              </span>
            </div>
          )}

          {isTargetSuperAdmin && !canEditSuperAdmin && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>เฉพาะ Super Admin เท่านั้นที่สามารถแก้ไขสิทธิ์ของ Super Admin ได้</span>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#5A4D41]">
              ชื่อผู้ใช้งาน (Username) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="username"
              required
              minLength={3}
              maxLength={30}
              defaultValue={userToEdit.username}
              placeholder="ชื่อผู้ใช้"
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
          </div>

          {/* System Role */}
          <input type="hidden" name="role" value="ADMIN" />

          {/* Admin Role Preset */}
          {selectedRole === "ADMIN" && (
            <div className="p-3.5 rounded-2xl bg-[#FFF9F0] border border-[#EADBCC] space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#3F342B] flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#B94E48]" />
                  บทบาทผู้ดูแล (Admin Role Preset)
                </label>
                <select
                  value={selectedAdminRole}
                  onChange={(e) => handleAdminRoleChange(e.target.value as AdminRoleType)}
                  disabled={isSelf || (isTargetSuperAdmin && !canEditSuperAdmin)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-white text-xs font-medium text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                >
                  <option value="SUPER_ADMIN" disabled={!canEditSuperAdmin}>
                    ผู้ดูแลระบบสูงสุด (Super Admin) - เต็มสิทธิ์ทุกระบบ
                  </option>
                  <option value="TEACHER">
                    อาจารย์ผู้สอน (Teacher) - การบ้าน, ตรวจงาน, เช็กชื่อ, นักเรียน
                  </option>
                  <option value="ASSISTANT">
                    ผู้ช่วยสอน (Assistant) - ตรวจงาน และเช็กชื่อเท่านั้น
                  </option>
                  <option value="CUSTOM">กำหนดสิทธิ์เองอย่างอิสระ (Custom)</option>
                </select>
                <p className="text-[11px] text-[#7A6A5C] mt-1">
                  {ROLE_LABELS[selectedAdminRole]?.description}
                </p>
              </div>

              {/* Granular Permissions Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-[#F2E8DC]">
                <label className="text-xs font-bold text-[#5A4D41]">
                  สิทธิ์การเข้าถึงฟังก์ชัน (Permissions):
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {ADMIN_PERMISSIONS_LIST.map((perm) => {
                    const isChecked =
                      selectedAdminRole === "SUPER_ADMIN"
                        ? true
                        : selectedPermissions.includes(perm.key);
                    const isReadOnly =
                      selectedAdminRole === "SUPER_ADMIN" ||
                      isSelf ||
                      (isTargetSuperAdmin && !canEditSuperAdmin);

                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? "bg-white border-[#D9A441] shadow-2xs"
                            : "bg-[#FAF6F0]/50 border-[#EADBCC] opacity-80"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isReadOnly}
                          onChange={() => handleTogglePermission(perm.key)}
                          className="mt-0.5 rounded text-[#B94E48] focus:ring-[#B94E48] accent-[#B94E48]"
                        />
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#3F342B]">
                              {perm.label}
                            </span>
                            <span className="text-[10px] text-[#8C5D23] font-medium bg-[#FAF0E1] px-1.5 py-0.5 rounded">
                              {perm.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7A6A5C] leading-snug mt-0.5">
                            {perm.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#5A4D41]">
              สถานะบัญชี (Status)
            </label>
            <select
              name="status"
              defaultValue={userToEdit.status}
              disabled={isSelf}
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60 disabled:bg-stone-100"
            >
              <option value="ACTIVE">ปกติ / เปิดใช้งาน (ACTIVE)</option>
              <option value="INACTIVE">ระงับการใช้งาน (INACTIVE)</option>
            </select>
          </div>

          {/* Linked student info display */}
          {userToEdit.studentInfo && (
            <div className="p-3 bg-[#FAF6F0] rounded-2xl border border-[#EADBCC] text-xs space-y-1">
              <span className="font-semibold text-[#8C5D23] flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                ข้อมูลนักเรียนที่ผูกกับบัญชีนี้:
              </span>
              <p className="text-[#3F342B]">
                {userToEdit.studentInfo.firstName} {userToEdit.studentInfo.lastName} (ห้อง{" "}
                {userToEdit.studentInfo.className} เลขที่ {userToEdit.studentInfo.studentNumber})
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F2E8DC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#D9CABB] text-xs font-semibold text-[#7A6A5C] hover:bg-[#FAF6F0] transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending || (isTargetSuperAdmin && !canEditSuperAdmin)}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#D9A441] hover:bg-[#C28F30] active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกการแก้ไข</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
