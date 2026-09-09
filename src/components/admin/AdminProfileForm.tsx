"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Save, Loader2, Sparkles, Check } from "lucide-react";
import { updateAdminProfileSelfAction } from "@/actions/profile";
import { showCozySuccess, showCozyError } from "@/lib/ui/swal";

interface AdminProfileFormProps {
  initialName?: string | null;
  username: string;
}

export function AdminProfileForm({ initialName, username }: AdminProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName || "");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      showCozyError("กรุณาระบุชื่อ", "กรุณากรอกชื่อ-นามสกุล หรือชื่อคุณครูผู้สอน");
      return;
    }

    setIsPending(true);
    const formData = new FormData();
    formData.set("name", name.trim());

    try {
      const res = await updateAdminProfileSelfAction(formData);
      if (res.success) {
        await showCozySuccess("บันทึกสำเร็จ!", res.message);
        router.refresh();
      } else {
        await showCozyError("ไม่สามารถบันทึกได้", res.message || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs p-6 sm:p-7 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2E8DC] pb-4">
        <div>
          <h3 className="font-bold text-base text-[#3F342B] flex items-center gap-2">
            <User className="w-5 h-5 text-[#8C5D23]" />
            <span>ข้อมูลชื่อคุณครูผู้สอน (Teacher Display Name)</span>
          </h3>
          <p className="text-xs text-[#7A6A5C] pt-0.5">
            ชื่อ-นามสกุลของคุณครูจะแสดงบนแถบเมนูด้านบน หัวรายงาน PDF การลงนามตรวจงาน และเอกสารประเมินผล
          </p>
        </div>

        {initialName && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0 self-start sm:self-auto">
            <Check className="w-3.5 h-3.5" />
            บันทึกชื่อแล้ว
          </span>
        )}
      </div>

      <div className="space-y-4 max-w-xl">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
            <span>ชื่อ-นามสกุล หรือชื่อเรียกคุณครู</span>
            <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              disabled={isPending}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น นายสมศักดิ์ รักเรียน หรือ ครูสมศักดิ์"
              className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60 font-medium"
            />
          </div>
          <p className="text-[11px] text-[#A8988B]">
            * ชื่อนี้จะถูกนำไปใช้ในลายเซ็นเอกสารราชการและการออกรายงานของระบบ (บัญชีผู้ใช้: @{username})
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 text-xs text-[#8C5D23]">
            <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
            <span>อัปเดตแบบ Real-Time ทั่วทั้งระบบ</span>
          </div>

          <button
            type="submit"
            disabled={isPending || (name.trim() === (initialName || "").trim() && !!initialName)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#8C5D23] hover:bg-[#724a1a] active:scale-95 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกชื่อคุณครู</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
