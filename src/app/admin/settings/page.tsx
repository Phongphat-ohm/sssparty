import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { Settings, Shield } from "lucide-react";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { getSystemSettings } from "@/lib/settings/system-settings";
import { SystemSettingsForm } from "@/components/admin/SystemSettingsForm";
import { AdminPasswordForm } from "@/components/admin/AdminPasswordForm";

export default async function AdminSettingsPage() {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN" || !session.userId) {
    redirect("/admin-login");
  }

  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        role: true,
        adminRole: true,
        permissions: true,
      },
    }),
    getSystemSettings(),
  ]);

  if (!user) {
    redirect("/admin-login");
  }

  const canManageSettings = hasAdminPermission(user, "MANAGE_SETTINGS");

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-5xl w-full mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3F342B] tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-[#8C5D23]" />
            ตั้งค่าระบบ & บัญชีผู้ใช้
          </h1>
          <p className="text-xs sm:text-sm text-[#7A6A5C] pt-0.5">
            ควบคุมโหมดบำรุงรักษา (Maintenance Mode) การตั้งค่ากลาง และความปลอดภัยส่วนบุคคล
          </p>
        </div>

        {/* Admin Badge */}
        <div className="bg-white rounded-2xl p-3 px-4 border border-[#EADBCC] shadow-2xs flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#B94E48] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
            {session.username.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <span className="font-bold text-xs text-[#3F342B] block">
              {session.username}
            </span>
            <span className="text-[10px] text-[#7A6A5C] flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#D9A441]" />
              <span>{user.adminRole || "TEACHER"}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 1. System-wide Dynamic Settings (Maintenance, Site Name, Academic Term, Upload Limit) */}
      <div className="space-y-4">
        <SystemSettingsForm
          initialSettings={settings}
          canManageSettings={canManageSettings}
        />
      </div>

      {/* 2. Personal Password Change Form */}
      <div className="space-y-3 pt-2">
        <div className="border-b border-[#F2E8DC] pb-2">
          <h2 className="font-bold text-base text-[#3F342B]">
            ความปลอดภัยส่วนบุคคล (Personal Security)
          </h2>
          <p className="text-xs text-[#7A6A5C]">
            เปลี่ยนรหัสผ่านสำหรับการเข้าสู่ระบบบัญชีนี้
          </p>
        </div>
        <AdminPasswordForm />
      </div>
    </div>
  );
}
