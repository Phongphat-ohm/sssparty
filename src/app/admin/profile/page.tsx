import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { UserCheck, Shield, KeyRound, Calendar, Settings, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  hasAdminPermission,
  ROLE_LABELS,
  ADMIN_PERMISSIONS_LIST,
  AdminPermissionType,
} from "@/lib/auth/permissions";
import { AdminPasswordForm } from "@/components/admin/AdminPasswordForm";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN" || !session.userId) {
    redirect("/admin-login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      role: true,
      adminRole: true,
      status: true,
      permissions: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    redirect("/admin-login");
  }

  const roleMeta = ROLE_LABELS[user.adminRole || "TEACHER"] || ROLE_LABELS.TEACHER;
  const canManageSettings = hasAdminPermission(user, "MANAGE_SETTINGS");

  const thaiCreatedDate = new Date(user.createdAt).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-4xl w-full mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#3F342B] tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-[#8C5D23]" />
            ข้อมูลส่วนตัว & บัญชีผู้ใช้
          </h1>
          <p className="text-xs sm:text-sm text-[#7A6A5C] pt-0.5">
            จัดการข้อมูลบัญชีผู้ใช้งาน ตรวจสอบสิทธิ์ที่ได้รับ และเปลี่ยนรหัสผ่านส่วนบุคคล
          </p>
        </div>

        {/* Quick Link to System Settings if permitted */}
        {canManageSettings && (
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-[#EADBCC] text-xs font-bold text-[#8C5D23] hover:bg-[#FAF0E1] hover:border-[#D9A441] transition-all shadow-2xs shrink-0 self-start sm:self-auto"
          >
            <Settings className="w-4 h-4 text-[#D9A441]" />
            <span>ไปที่ตั้งค่าระบบส่วนกลาง</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* 1. Account Details Card */}
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2E8DC] pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF0E1] text-[#8C5D23] border border-[#EADBCC] flex items-center justify-center font-bold text-2xl shadow-inner shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-extrabold text-[#3F342B] tracking-tight">
                  {user.username}
                </h2>
                <span
                  className={`text-[11px] font-bold px-3 py-0.5 rounded-full border ${roleMeta.badgeColor}`}
                >
                  {roleMeta.label}
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {user.status === "ACTIVE" ? "สถานะปกติ" : user.status}
                </span>
              </div>
              <p className="text-xs text-[#7A6A5C] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#A8988B]" />
                <span>สร้างบัญชีเมื่อ: {thaiCreatedDate}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Permissions list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#3F342B] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#8C5D23]" />
              สิทธิ์การเข้าถึงระบบที่ได้รับมอบหมาย
            </h3>
            <span className="text-xs text-[#7A6A5C]">
              {user.adminRole === "SUPER_ADMIN"
                ? "สิทธิ์ระดับผู้ดูแลระบบสูงสุด (เข้าถึงได้ทุกระบบ)"
                : `ได้รับมอบหมาย ${user.permissions.length} สิทธิ์`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {ADMIN_PERMISSIONS_LIST.map((perm) => {
              const hasPerm =
                user.adminRole === "SUPER_ADMIN" ||
                user.permissions.includes(perm.key as AdminPermissionType);

              return (
                <div
                  key={perm.key}
                  className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                    hasPerm
                      ? "bg-[#FAF6F0] border-[#EADBCC]"
                      : "bg-neutral-50/50 border-neutral-200 opacity-50"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        hasPerm ? "text-emerald-600" : "text-neutral-400"
                      }`}
                    />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p
                      className={`text-xs font-bold leading-tight ${
                        hasPerm ? "text-[#3F342B]" : "text-neutral-500"
                      }`}
                    >
                      {perm.label}
                    </p>
                    <p className="text-[11px] text-[#7A6A5C] leading-snug">
                      {perm.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Personal Password Change Form */}
      <div className="space-y-3">
        <div className="border-b border-[#F2E8DC] pb-2">
          <h2 className="font-bold text-base text-[#3F342B] flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#B94E48]" />
            ความปลอดภัย & เปลี่ยนรหัสผ่าน (Change Password)
          </h2>
          <p className="text-xs text-[#7A6A5C]">
            เปลี่ยนรหัสผ่านสำหรับการเข้าสู่ระบบบัญชีนี้ของคุณ
          </p>
        </div>
        <AdminPasswordForm />
      </div>
    </div>
  );
}
