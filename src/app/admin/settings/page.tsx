import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { Settings, Shield, User, KeyRound } from "lucide-react";
import { AdminPasswordForm } from "@/components/admin/AdminPasswordForm";

export default async function AdminSettingsPage() {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin-login");
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-5xl w-full mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#3F342B] tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#B94E48]" />
          ตั้งค่าระบบและบัญชีผู้ใช้
        </h1>
        <p className="text-xs sm:text-sm text-[#7A6A5C]">
          จัดการความปลอดภัยและเปลี่ยนรหัสผ่านผู้ดูแลระบบ
        </p>
      </div>

      {/* Admin Info Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-xs flex items-center gap-4 max-w-xl">
        <div className="w-12 h-12 rounded-2xl bg-[#B94E48] text-white flex items-center justify-center font-bold text-lg shadow-sm">
          {session.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="font-bold text-base text-[#3F342B]">{session.username}</h2>
          <p className="text-xs text-[#7A6A5C] flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-[#D9A441]" />
            สถานะ: ผู้ดูแลระบบ / อาจารย์ผู้สอน
          </p>
        </div>
      </div>

      {/* Password Change Form */}
      <AdminPasswordForm />
    </div>
  );
}
