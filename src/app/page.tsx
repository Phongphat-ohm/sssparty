import Link from "next/link";
import { Sparkles, GraduationCap, ShieldCheck, ArrowRight, FolderKanban, CheckCircle2 } from "lucide-react";
import { getAuthSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getAuthSession();

  return (
    <div className="min-h-screen bg-[#FFF9F0] flex flex-col justify-between">
      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#EADBCC] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#D9A441] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              S
            </div>
            <div>
              <span className="font-bold text-lg text-[#3F342B] tracking-tight">SSSParty</span>
              <span className="block text-[11px] text-[#7A6A5C] -mt-1 font-medium">ชุมนุมสื่อสร้างสรรค์</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session ? (
              <Link
                href={session.role === "ADMIN" ? "/admin/dashboard" : "/student/dashboard"}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#D9A441] text-white hover:bg-[#C28F30] transition-all shadow-xs"
              >
                เข้าสู่ {session.role === "ADMIN" ? "Admin Studio" : "ห้องเรียน"}
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/student-login"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#D9CABB] text-[#3F342B] hover:border-[#D9A441] transition-all"
                >
                  นักเรียน
                </Link>
                <Link
                  href="/admin-login"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#B94E48] text-white hover:bg-[#A33F39] transition-all shadow-xs"
                >
                  ครูผู้สอน
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 py-16 text-center space-y-8 my-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FAF0E1] border border-[#EADBCC] text-xs font-semibold text-[#8C5D23]">
          <Sparkles className="w-4 h-4 text-[#D9A441]" />
          ระบบส่งงานและประเมินผลชุมนุมสื่อสร้างสรรค์
        </div>

        <div className="space-y-4 max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#3F342B] tracking-tight leading-tight">
            พื้นที่สร้างสรรค์สื่อ <br />
            <span className="text-[#B94E48]">ส่งงานง่าย</span> ตรวจงานโปร่งใส
          </h1>
          <p className="text-base sm:text-lg text-[#6E5D4F] leading-relaxed">
            ห้องเรียนดิจิทัลสำหรับสมาชิกชุมนุมสื่อสร้างสรรค์ ส่งงานผ่านระบบคลาวด์ที่ปลอดภัย พร้อมเกณฑ์การให้คะแนนแบบ Rubric ที่ชัดเจนตรงไปตรงมา
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto pt-4 text-left">
          {/* Student Card */}
          <Link
            href="/student-login"
            className="group bg-white rounded-3xl p-6 border-2 border-[#EADBCC] hover:border-[#D9A441] hover:shadow-xl transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#D9A441]/10 rounded-bl-full transition-transform group-hover:scale-110" />
            <div className="space-y-4 relative">
              <div className="w-12 h-12 rounded-2xl bg-[#D9A441]/20 text-[#D9A441] flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#3F342B] group-hover:text-[#D9A441] transition-colors">
                  สำหรับนักเรียน
                </h3>
                <p className="text-xs text-[#7A6A5C] mt-1">
                  เข้าดูการบ้าน ตรวจสอบเกณฑ์ Rubric และอัปโหลดไฟล์ส่งงานได้สะดวกบนมือถือ
                </p>
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#D9A441]">
                เข้าสู่ห้องเรียน <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Admin Card */}
          <Link
            href="/admin-login"
            className="group bg-white rounded-3xl p-6 border-2 border-[#EADBCC] hover:border-[#B94E48] hover:shadow-xl transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#B94E48]/10 rounded-bl-full transition-transform group-hover:scale-110" />
            <div className="space-y-4 relative">
              <div className="w-12 h-12 rounded-2xl bg-[#B94E48]/20 text-[#B94E48] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#3F342B] group-hover:text-[#B94E48] transition-colors">
                  สำหรับครูผู้สอน
                </h3>
                <p className="text-xs text-[#7A6A5C] mt-1">
                  สร้างงาน กำหนด Rubrics สตรีมดูผลงานนักเรียนสด และตัดเกรดผ่านห้องตรวจงาน
                </p>
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#B94E48]">
                เข้าสู่ห้องตรวจงาน <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[#7A6A5C]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ตรวจสอบสิทธิ์สองชั้น (RBAC)
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ระบบเกณฑ์ Rubric คำนวณสด
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> จัดเก็บไฟล์ปลอดภัยบน S3
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#EADBCC] py-6 text-center text-xs text-[#A8988B] bg-white">
        ชุมนุมสื่อสร้างสรรค์ (SSSParty) • ระบบส่งงานแบบ Classroom ขนาดกะทัดรัด ปลอดภัยสูง
      </footer>
    </div>
  );
}
