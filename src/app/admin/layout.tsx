import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { getSystemSettings } from "@/lib/settings/system-settings";
import { Wrench, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const [adminUser, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        adminRole: true,
        permissions: true,
        status: true,
      },
    }),
    getSystemSettings(),
  ]);

  if (!adminUser || adminUser.status !== "ACTIVE") {
    redirect("/admin-login");
  }

  return (
    <div className="h-screen h-dvh bg-[#FFF9F0] flex flex-col md:flex-row overflow-hidden">
      <AdminSidebar
        adminName={session.username}
        adminRole={adminUser.adminRole}
        permissions={adminUser.permissions}
      />
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <AdminNavbar adminName={session.username} academicTerm={settings.academic_term} />
        {settings.maintenance_mode && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-xs z-10 shrink-0">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 animate-bounce" />
              <span>
                <strong>โหมดปรับปรุงระบบกำลังเปิดใช้งาน:</strong> นักเรียนจะไม่สามารถเข้าใช้งานหรือส่งงานได้
              </span>
            </div>
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-1 font-bold underline hover:text-amber-100 transition-colors"
            >
              <span>ตั้งค่า/ปิดโหมด</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
        <main className="flex-1 min-w-0 h-full overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  );
}
