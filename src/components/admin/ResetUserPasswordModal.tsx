"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, KeyRound, Save, Loader2, Lock, ShieldAlert } from "lucide-react";
import { resetUserPasswordAction } from "@/actions/user";
import { showCozySuccess, showCozyError } from "@/lib/ui/swal";
import { UserItem } from "./EditUserModal";

interface ResetUserPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserItem | null;
}

export function ResetUserPasswordModal({
  isOpen,
  onClose,
  user,
}: ResetUserPasswordModalProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const form = e.currentTarget;
    const newPassword = (form.elements.namedItem("newPassword") as HTMLInputElement)?.value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement)?.value;

    if (newPassword !== confirmPassword) {
      setErrorMsg("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setIsPending(true);
    const formData = new FormData(form);

    try {
      const res = await resetUserPasswordAction(user.id, formData);

      if (!res.success) {
        setErrorMsg(res.message || "เกิดข้อผิดพลาดในการตั้งรหัสผ่าน");
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
        {/* Header */}
        <div className="p-5 border-b border-[#F2E8DC] flex items-center justify-between bg-[#FFF9F0]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-[#B94E48] flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#3F342B] text-base leading-tight">
                ตั้งรหัสผ่านใหม่
              </h3>
              <p className="text-[11px] text-[#7A6A5C]">
                รีเซ็ตรหัสผ่านสำหรับ: <span className="font-bold text-[#3F342B]">{user.username}</span>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-[#B94E48] rounded-xl text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              การตั้งรหัสผ่านใหม่จะมีผลทันที ผู้ใช้งานจะต้องใช้รหัสผ่านใหม่นี้ในการเข้าสู่ระบบครั้งต่อไป
            </span>
          </div>

          {/* New Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#5A4D41]">
              รหัสผ่านใหม่ <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                name="newPassword"
                required
                minLength={6}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full pl-3.5 pr-9 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#B94E48]"
              />
              <Lock className="w-3.5 h-3.5 text-[#A8988B] absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#5A4D41]">
              ยืนยันรหัสผ่านใหม่ <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={6}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                className="w-full pl-3.5 pr-9 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#B94E48]"
              />
              <KeyRound className="w-3.5 h-3.5 text-[#A8988B] absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Actions */}
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
                  <span>บันทึกรหัสผ่าน</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
