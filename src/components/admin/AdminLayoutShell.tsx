"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { Wrench, ArrowRight } from "lucide-react";

interface AdminLayoutShellProps {
  adminName: string;
  adminRole: any;
  permissions: any;
  academicTerm: string;
  maintenanceMode: boolean;
  children: React.ReactNode;
}

export function AdminLayoutShell({
  adminName,
  adminRole,
  permissions,
  academicTerm,
  maintenanceMode,
  children,
}: AdminLayoutShellProps) {
  const pathname = usePathname();
  const isProjectorScreen = pathname?.endsWith("/projector");

  // หากเป็นหน้าฉายโปรเจกเตอร์ ให้แสดงผลเต็มจอ 100% ปราศจาก Sidebar และ Navbar
  if (isProjectorScreen) {
    return <div className="min-h-screen bg-stone-950">{children}</div>;
  }

  return (
    <div className="h-screen h-dvh bg-[#FFF9F0] flex flex-col md:flex-row overflow-hidden">
      <AdminSidebar
        adminName={adminName}
        adminRole={adminRole}
        permissions={permissions}
      />
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <AdminNavbar adminName={adminName} academicTerm={academicTerm} />
        {maintenanceMode && (
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
