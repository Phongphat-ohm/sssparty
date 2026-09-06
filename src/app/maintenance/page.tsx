import Link from "next/link";
import { Wrench, Clock, Shield, ArrowRight } from "lucide-react";
import { getSystemSettings } from "@/lib/settings/system-settings";
import { MaintenanceCountdown } from "@/components/common/MaintenanceCountdown";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const settings = await getSystemSettings();

  return (
    <div className="min-h-screen bg-[#FFF9F0] text-[#3F342B] flex flex-col items-center justify-center p-4 selection:bg-[#D9A441] selection:text-white">
      <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-10 border border-[#EADBCC] shadow-xl text-center space-y-6 relative overflow-hidden">
        {/* Glow decorations */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-40 h-40 bg-rose-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Maintenance Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center shadow-inner">
          <Wrench className="w-10 h-10 animate-pulse" />
        </div>

        {/* Title and Message */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100/70 text-amber-800 border border-amber-200">
            System Maintenance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3F342B] tracking-tight">
            ระบบกำลังปิดปรับปรุงชั่วคราว
          </h1>
          <p className="text-sm text-[#7A6A5C] leading-relaxed pt-2">
            {settings.maintenance_message}
          </p>
        </div>

        {/* Expected End Time & Live Countdown */}
        {settings.maintenance_expected_end && (
          <MaintenanceCountdown targetTime={settings.maintenance_expected_end} />
        )}

        <div className="border-t border-[#F2E8DC] pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7A6A5C]">
          <span>{settings.site_name}</span>

          <Link
            href="/admin-login"
            className="inline-flex items-center gap-1 text-[#8C5D23] font-bold hover:underline transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>เข้าสู่ระบบสำหรับอาจารย์</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
