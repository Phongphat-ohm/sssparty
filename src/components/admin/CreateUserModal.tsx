"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, UserPlus, Save, Loader2, Shield, GraduationCap, Lock, KeyRound, ShieldCheck } from "lucide-react";
import { createUserAction } from "@/actions/user";
import { showCozySuccess, showCozyError } from "@/lib/ui/swal";
import {
  AdminRoleType,
  AdminPermissionType,
  ADMIN_PERMISSIONS_LIST,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS,
} from "@/lib/auth/permissions";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: AdminRoleType | null;
}

export function CreateUserModal({
  isOpen,
  onClose,
  currentUserRole = "SUPER_ADMIN",
}: CreateUserModalProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [role, setRole] = useState<"ADMIN" | "STUDENT">("ADMIN");
  const [adminRole, setAdminRole] = useState<AdminRoleType>("TEACHER");
  const [permissions, setPermissions] = useState<AdminPermissionType[]>(
    ROLE_DEFAULT_PERMISSIONS.TEACHER
  );

  if (!isOpen) return null;

  const canCreateSuperAdmin = currentUserRole === "SUPER_ADMIN";

  const handleAdminRoleChange = (newRole: AdminRoleType) => {
    setAdminRole(newRole);
    if (newRole !== "CUSTOM") {
      setPermissions(ROLE_DEFAULT_PERMISSIONS[newRole] || []);
    }
  };

  const handleTogglePermission = (perm: AdminPermissionType) => {
    if (adminRole !== "CUSTOM") {
      setAdminRole("CUSTOM");
    }
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement)?.value;

    if (password !== confirmPassword) {
      setErrorMsg("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setIsPending(true);
    const formData = new FormData(form);

    if (role === "ADMIN") {
      formData.set("adminRole", adminRole);
      formData.delete("permissions");
      permissions.forEach((p) => formData.append("permissions", p));
    }

    try {
      const res = await createUserAction(formData);

      if (!res.success) {
        setErrorMsg(res.message || "เกิดข้อผิดพลาดในการสร้างบัญชี");
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
        {/* Modal Header */}
        <div className="p-5 border-b border-[#F2E8DC] flex items-center justify-between bg-[#FFF9F0]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FAF0E1] text-[#B94E48] flex items-center justify-center border border-[#EADBCC]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#3F342B] text-base leading-tight">
                เพิ่มผู้ใช้งานใหม่
              </h3>
              <p className="text-[11px] text-[#7A6A5C]">
                สร้างบัญชีผู้ดูแลระบบ กำหนดบทบาทและสิทธิ์การใช้งาน
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-[#B94E48] rounded-xl text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Role Selection */}
          <div className="space-y-1.5">
            <input type="hidden" name="role" value="ADMIN" />
          </div>

          {/* Admin Role & Permissions */}
          {role === "ADMIN" && (
            <div className="p-3.5 rounded-2xl bg-[#FFF9F0] border border-[#EADBCC] space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#3F342B] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#B94E48]" />
                  บทบาทผู้ดูแล (Admin Role Preset)
                </label>
                <select
                  value={adminRole}
                  onChange={(e) => handleAdminRoleChange(e.target.value as AdminRoleType)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-white text-xs font-medium text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                >
                  <option value="TEACHER">
                    อาจารย์ผู้สอน (Teacher) - การบ้าน, ตรวจงาน, เช็กชื่อ, นักเรียน
                  </option>
                  <option value="ASSISTANT">
                    ผู้ช่วยสอน (Assistant) - ตรวจงาน และเช็กชื่อเท่านั้น
                  </option>
                  <option value="SUPER_ADMIN" disabled={!canCreateSuperAdmin}>
                    ผู้ดูแลระบบสูงสุด (Super Admin) - สิทธิ์เต็มทุกโมดูล
                  </option>
                  <option value="CUSTOM">กำหนดสิทธิ์เองอย่างอิสระ (Custom)</option>
                </select>
                <p className="text-[11px] text-[#7A6A5C] mt-1">
                  {ROLE_LABELS[adminRole]?.description}
                </p>
              </div>

              {/* Permissions Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-[#F2E8DC]">
                <label className="text-xs font-bold text-[#5A4D41]">
                  สิทธิ์การเข้าถึงฟังก์ชัน:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {ADMIN_PERMISSIONS_LIST.map((perm) => {
                    const isChecked =
                      adminRole === "SUPER_ADMIN" ? true : permissions.includes(perm.key);
                    const isReadOnly = adminRole === "SUPER_ADMIN";

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
              placeholder="เช่น teacher_kru, ass_somchai"
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
            <p className="text-[10px] text-[#A8988B]">
              ใช้ตัวอักษรภาษาอังกฤษ ตัวเลข, จุด (.), ขีดล่าง (_) หรือยัติภังค์ (-)
            </p>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#5A4D41]">
              รหัสผ่าน <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full pl-3.5 pr-9 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
              <Lock className="w-3.5 h-3.5 text-[#A8988B] absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#5A4D41]">
              ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={6}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                className="w-full pl-3.5 pr-9 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
              <KeyRound className="w-3.5 h-3.5 text-[#A8988B] absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Initial Status */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#5A4D41]">
              สถานะเริ่มต้น
            </label>
            <select
              name="status"
              defaultValue="ACTIVE"
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="ACTIVE">ปกติ / เปิดใช้งาน (ACTIVE)</option>
              <option value="INACTIVE">ระงับการใช้งาน (INACTIVE)</option>
            </select>
          </div>

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
              disabled={isPending}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#B94E48] hover:bg-[#A33F39] active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>สร้างผู้ใช้</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
