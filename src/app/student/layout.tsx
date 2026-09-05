import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { StudentNavbar } from "@/components/student/StudentNavbar";
import { StudentBottomNav } from "@/components/student/StudentBottomNav";
import { getSystemSettings } from "@/lib/settings/system-settings";
import { Wrench, Clock, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/student-login");
  }

  const settings = await getSystemSettings();

  const studentName = session.name || session.username;
  const studentCode = session.studentCode || "";
  const className = session.className || "";
  const studentNumber = session.studentNumber || 0;

  if (settings.maintenance_mode) {
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex flex-col justify-between selection:bg-[#D9A441] selection:text-white">
        <div>
          <StudentNavbar
            studentName={studentName}
            studentCode={studentCode}
            className={className}
            studentNumber={studentNumber}
          />
          <main className="max-w-xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EADBCC] shadow-xl text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-40 h-40 bg-rose-400/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative mx-auto w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center shadow-inner">
                <Wrench className="w-10 h-10 animate-pulse" />
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100/80 text-amber-800 border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ระบบปิดปรับปรุงชั่วคราว
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3F342B] tracking-tight">
                  ระบบไม่พร้อมใช้งาน
                </h1>
                <p className="text-sm sm:text-base text-[#7A6A5C] leading-relaxed pt-2 whitespace-pre-line">
                  {settings.maintenance_message}
                </p>
              </div>

              {settings.maintenance_expected_end && (
                <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] flex items-center justify-center gap-2.5 text-xs sm:text-sm text-[#5A4D41] font-medium">
                  <Clock className="w-4.5 h-4.5 text-[#D9A441] shrink-0" />
                  <span>
                    คาดว่าจะเปิดให้บริการตามปกติเวลา:{" "}
                    <strong className="text-[#3F342B] font-bold">
                      {settings.maintenance_expected_end}
                    </strong>
                  </span>
                </div>
              )}

              <p className="text-xs text-[#A8988B] pt-2 border-t border-[#F2E8DC]">
                ระบบปิดรับการส่งงานและดูข้อมูลชั่วคราวเพื่อปรับปรุงระบบ ขออภัยในความไม่สะดวก
              </p>
            </div>
          </main>
        </div>

        <StudentBottomNav
          studentName={studentName}
          className={className}
          studentNumber={studentNumber}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F0] flex flex-col justify-between">
      <div>
        <StudentNavbar
          studentName={studentName}
          studentCode={studentCode}
          className={className}
          studentNumber={studentNumber}
        />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <StudentBottomNav
        studentName={studentName}
        className={className}
        studentNumber={studentNumber}
      />
    </div>
  );
}
