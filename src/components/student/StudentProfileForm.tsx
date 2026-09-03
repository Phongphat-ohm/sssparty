"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Save, Loader2, ShieldCheck, Hash, School, Sparkles, CheckCircle2 } from "lucide-react";
import { updateStudentProfileSelfAction } from "@/actions/profile";
import { showCozySuccess, showCozyError } from "@/lib/ui/swal";

interface StudentProfileFormProps {
  initialFirstName: string;
  initialLastName: string;
  studentCode: string;
  className: string;
  studentNumber: number;
}

export function StudentProfileForm({
  initialFirstName,
  initialLastName,
  studentCode,
  className,
  studentNumber,
}: StudentProfileFormProps) {
  const router = useRouter();

  // Profile form state
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    const formData = new FormData();
    formData.set("firstName", firstName);
    formData.set("lastName", lastName);

    try {
      const res = await updateStudentProfileSelfAction(formData);
      if (res.success) {
        await showCozySuccess("บันทึกสำเร็จ!", res.message);
        router.refresh();
      } else {
        await showCozyError("ไม่สามารถบันทึกได้", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-7 border-b border-[#F2E8DC] bg-[#FAF6F0]/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center font-bold shadow-2xs">
            <User className="w-5 h-5 text-[#D9A441]" />
          </div>
          <div>
            <h2 className="font-bold text-base text-[#3F342B]">
              แก้ไขข้อมูลส่วนตัวนักเรียน
            </h2>
            <p className="text-xs text-[#7A6A5C]">
              อัปเดตชื่อจริงและนามสกุลสำหรับแสดงในรายงานผลงานและการเช็กชื่อ
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>บัญชีปกติ</span>
        </span>
      </div>

      <form onSubmit={handleUpdateProfile} className="p-5 sm:p-7 space-y-6">
        {/* Editable Fields */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6A5C]">
            ข้อมูลชื่อ-นามสกุลที่สามารถแก้ไขได้
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41]">
                ชื่อจริง <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="กรอกชื่อจริง"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41]">
                นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="กรอกนามสกุล"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>
          </div>
        </div>

        {/* Read-only Academic Credentials Card */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6A5C]">
            ข้อมูลทะเบียนนักเรียนและการเข้าสู่ระบบ
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white text-[#D9A441] flex items-center justify-center border border-[#EADBCC]">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-[#7A6A5C] block">รหัสประจำตัวนักเรียน</span>
                <strong className="text-sm font-bold text-[#3F342B]">{studentCode}</strong>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white text-[#D9A441] flex items-center justify-center border border-[#EADBCC]">
                <School className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-[#7A6A5C] block">ชั้นเรียน</span>
                <strong className="text-sm font-bold text-[#3F342B]">{className}</strong>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white text-[#D9A441] flex items-center justify-center border border-[#EADBCC]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-[#7A6A5C] block">เลขที่</span>
                <strong className="text-sm font-bold text-[#3F342B]">{studentNumber}</strong>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFF9F0] border border-[#EADBCC] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#D9A441] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-[#7A6A5C]">
              <p className="font-bold text-[#3F342B]">
                การเข้าสู่ระบบของนักเรียน: ไม่ต้องใช้รหัสผ่าน (Passwordless)
              </p>
              <p className="leading-relaxed">
                ระบบชุมนุมออกแบบให้นักเรียนเข้าสู่ระบบด้วย <strong>รหัสนักเรียน</strong>, <strong>ชั้นเรียน</strong> และ <strong>เลขที่</strong> เพื่อความสะดวกรวดเร็วในการส่งงาน โดยไม่ต้องจำหรือตั้งค่ารหัสผ่าน
              </p>
              <p className="text-[11px] text-[#A8988B] pt-1">
                * หากต้องการย้ายชั้นเรียนหรือแก้ไขเลขที่ กรุณาติดต่อคุณครูผู้ดูแลชุมนุม
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-3 border-t border-[#F2E8DC]">
          <button
            type="submit"
            disabled={isUpdatingProfile}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#D9A441] hover:bg-[#C28F30] active:scale-95 disabled:opacity-50 transition-all shadow-md cursor-pointer"
          >
            {isUpdatingProfile ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการเปลี่ยนแปลง</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
