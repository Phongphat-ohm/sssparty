import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { Settings, Shield, UserCheck, ArrowRight, AlertTriangle } from "lucide-react";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { getSystemSettings } from "@/lib/settings/system-settings";
import { SystemSettingsForm } from "@/components/admin/SystemSettingsForm";

export const dynamic = "force-dynamic";

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
            ตั้งค่าระบบส่วนกลาง
          </h1>
          <p className="text-xs sm:text-sm text-[#7A6A5C] pt-0.5">
            ควบคุมโหมดปรับปรุงระบบ (Maintenance Mode) การตั้งค่ากลาง ภาคเรียน และขนาดไฟล์อัปโหลด
          </p>
        </div>

        {/* Quick Link to Personal Profile */}
        <Link
          href="/admin/profile"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-[#EADBCC] text-xs font-bold text-[#8C5D23] hover:bg-[#FAF0E1] hover:border-[#D9A441] transition-all shadow-2xs shrink-0 self-start sm:self-auto"
        >
          <UserCheck className="w-4 h-4 text-[#B94E48]" />
          <span>ไปที่ข้อมูลส่วนตัว & รหัสผ่าน</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Permission Notice (If user cannot manage settings) */}
      {!canManageSettings && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">โหมดดูอย่างเดียว (Read Only)</span>
            บัญชีของคุณไม่มีสิทธิ์ <strong>MANAGE_SETTINGS</strong> คุณจึงสามารถดูค่าการตั้งค่าระบบได้ แต่ไม่สามารถแก้ไขหรือบันทึกค่าได้
          </div>
        </div>
      )}

      {/* System Settings Form (Maintenance, Site Name, Academic Term, Upload Limit) */}
      <div className="space-y-4">
        <SystemSettingsForm
          initialSettings={settings}
          canManageSettings={canManageSettings}
        />
      </div>
    </div>
  );
}
