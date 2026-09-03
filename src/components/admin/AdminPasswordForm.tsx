"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Save, Loader2, ShieldCheck } from "lucide-react";
import { changeAdminPasswordAction } from "@/actions/profile";
import { showCozySuccess, showCozyError } from "@/lib/ui/swal";

export function AdminPasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      await showCozyError("ข้อผิดพลาด", "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (newPassword.length < 6) {
      await showCozyError("ข้อผิดพลาด", "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setIsPending(true);

    const formData = new FormData();
    formData.set("currentPassword", currentPassword);
    formData.set("newPassword", newPassword);
    formData.set("confirmPassword", confirmPassword);

    try {
      const res = await changeAdminPasswordAction(formData);
      if (res.success) {
        await showCozySuccess("สำเร็จ!", res.message);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        router.refresh();
      } else {
        await showCozyError("ไม่สามารถเปลี่ยนรหัสผ่านได้", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs p-6 sm:p-8 space-y-5 max-w-xl">
      <div className="space-y-1 border-b border-[#F2E8DC] pb-4">
        <h3 className="font-bold text-base text-[#3F342B] flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[#B94E48]" />
          เปลี่ยนรหัสผ่านผู้ดูแลระบบ (Admin Password)
        </h3>
        <p className="text-xs text-[#7A6A5C]">
          เพื่อความปลอดภัยของระบบ กรุณากำหนดรหัสผ่านที่มีความยาวอย่างน้อย 6 ตัวอักษร
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#5A4D41]">
            รหัสผ่านปัจจุบัน <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            placeholder="กรอกรหัสผ่านปัจจุบัน"
            className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#B94E48]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#5A4D41]">
            รหัสผ่านใหม่ <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            placeholder="อย่างน้อย 6 ตัวอักษร"
            className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#B94E48]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#5A4D41]">
            ยืนยันรหัสผ่านใหม่ <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
            className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#B94E48]"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#B94E48] hover:bg-[#A33F39] active:scale-95 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกรหัสผ่านใหม่</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
