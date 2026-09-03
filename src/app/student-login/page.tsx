"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { studentLoginAction } from "@/actions/auth";
import { GraduationCap, Hash, School, Sparkles, ArrowRight, Loader2 } from "lucide-react";

export default function StudentLoginPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(studentLoginAction, null);

  useEffect(() => {
    if (state?.success && state.redirectUrl) {
      router.push(state.redirectUrl);
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FFF9F0]">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#EADBCC] p-8 space-y-6 relative overflow-hidden">
        {/* Decorative background accents */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#D9A441]/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#C96B4B]/15 rounded-full blur-2xl" />

        <div className="text-center space-y-2 relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#D9A441]/20 text-[#D9A441] mb-2 shadow-inner">
            <GraduationCap className="w-8 h-8 text-[#D9A441]" />
          </div>
          <h1 className="text-2xl font-bold text-[#3F342B] tracking-tight">
            เข้าสู่ระบบนักเรียน
          </h1>
          <p className="text-sm text-[#7A6A5C] flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#D9A441]" />
            ชุมนุมสื่อสร้างสรรค์ (SSSParty)
          </p>
        </div>

        {state?.message && !state.success && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-[#B94E48] rounded-xl text-sm font-medium flex items-center gap-2">
            <span>⚠️</span>
            <span>{state.message}</span>
          </div>
        )}

        <form action={formAction} className="space-y-4 relative">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5A4D41]">
              รหัสนักเรียน (Student Code)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#A8988B]">
                <Hash className="w-5 h-5" />
              </span>
              <input
                name="studentCode"
                type="text"
                required
                autoComplete="off"
                placeholder="กรอกรหัสประจำตัวนักเรียน"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-[#3F342B] placeholder-[#B5A597] focus:outline-none focus:ring-2 focus:ring-[#D9A441] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5A4D41]">
                ชั้นเรียน (Class)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#A8988B]">
                  <School className="w-5 h-5" />
                </span>
                <input
                  name="className"
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="เช่น ม.4/1"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-[#3F342B] placeholder-[#B5A597] focus:outline-none focus:ring-2 focus:ring-[#D9A441] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5A4D41]">
                เลขที่ (No.)
              </label>
              <input
                name="studentNumber"
                type="number"
                min="1"
                required
                autoComplete="off"
                placeholder="เลขที่"
                className="w-full px-4 py-3 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-[#3F342B] placeholder-[#B5A597] focus:outline-none focus:ring-2 focus:ring-[#D9A441] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-white bg-[#D9A441] hover:bg-[#C28F30] active:scale-[0.99] transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>กำลังตรวจสอบ...</span>
              </span>
            ) : (
              <span>เข้าสู่ห้องเรียนส่งงาน</span>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-[#EADBCC] text-center space-y-3">
          <Link
            href="/admin-login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#B94E48] hover:text-[#9A3A35] transition-colors"
          >
            สำหรับคุณครูผู้สอน เข้าสู่ระบบที่นี่
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-[#A8988B]">
            ชุมนุมสื่อสร้างสรรค์ — อบอุ่น ปลอดภัย ส่งงานง่าย
          </p>
        </div>
      </div>
    </div>
  );
}
