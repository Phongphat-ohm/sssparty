"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, UserPlus, Save, Loader2, Shield, GraduationCap, Lock, KeyRound } from "lucide-react";
import { createUserAction } from "@/actions/user";
import { showCozySuccess, showCozyError } from "@/lib/ui/swal";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateUserModal({ isOpen, onClose }: CreateUserModalProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [role, setRole] = useState<"ADMIN" | "STUDENT">("ADMIN");

  if (!isOpen) return null;

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
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#F2E8DC] flex items-center justify-between bg-[#FFF9F0]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FAF0E1] text-[#B94E48] flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#3F342B] text-base leading-tight">
                เพิ่มผู้ใช้งานใหม่
              </h3>
              <p className="text-[11px] text-[#7A6A5C]">
                สร้างบัญชีผู้ดูแลระบบหรือบัญชีผู้ใช้งานในระบบ
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-[#B94E48] rounded-xl text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Role Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5A4D41]">
              ระดับสิทธิ์การใช้งาน <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("ADMIN")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  role === "ADMIN"
                    ? "bg-red-50 border-[#B94E48] text-[#B94E48] shadow-xs"
                    : "bg-[#FAF6F0] border-[#EADBCC] text-[#7A6A5C] hover:bg-stone-50"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>แอดมิน / อาจารย์</span>
              </button>

              <button
                type="button"
                onClick={() => setRole("STUDENT")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  role === "STUDENT"
                    ? "bg-[#FAF0E1] border-[#D9A441] text-[#8C5D23] shadow-xs"
                    : "bg-[#FAF6F0] border-[#EADBCC] text-[#7A6A5C] hover:bg-stone-50"
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>นักเรียนทั่วไป</span>
              </button>
            </div>
            <input type="hidden" name="role" value={role} />

            {role === "STUDENT" && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
                💡 คำแนะนำ: หากต้องการเพิ่มนักเรียนพร้อมข้อมูลชั้นเรียนและเลขที่ แนะนำให้ไปที่หน้า{" "}
                <strong className="underline">รายชื่อนักเรียนในชุมนุม</strong>
              </p>
            )}
          </div>

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
              placeholder="เช่น kru_somchai, teacher_art, 10007"
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
              <option value="ACTIVE">ปกติ / เปิดใช้งาน (Active)</option>
              <option value="INACTIVE">ระงับการใช้งานชั่วคราว (Inactive)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2E8DC]">
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
                  <span>สร้างบัญชีผู้ใช้</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
