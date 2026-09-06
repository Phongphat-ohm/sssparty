"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  ClipboardCheck,
  Users,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Sparkles,
  Settings,
  Calendar,
  UserCog,
  History,
  UserCheck,
  FileText,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import {
  AdminRoleType,
  AdminPermissionType,
  hasAdminPermission,
  ROLE_LABELS,
} from "@/lib/auth/permissions";

interface AdminSidebarProps {
  adminName: string;
  adminRole?: AdminRoleType | null;
  permissions?: AdminPermissionType[];
}

export function AdminSidebar({
  adminName,
  adminRole = "TEACHER",
  permissions = [],
}: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const userObj = {
    role: "ADMIN",
    adminRole,
    permissions,
  };

  const navItems: Array<{
    name: string;
    href: string;
    icon: any;
    permission?: AdminPermissionType;
  }> = [
    {
      name: "ภาพรวมระบบ (Dashboard)",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "การบ้านทั้งหมด",
      href: "/admin/assignments",
      icon: BookOpen,
      permission: "MANAGE_ASSIGNMENTS",
    },
    {
      name: "สร้างการบ้านใหม่",
      href: "/admin/assignments/new",
      icon: PlusCircle,
      permission: "MANAGE_ASSIGNMENTS",
    },
    {
      name: "ห้องตรวจงาน (Grading)",
      href: "/admin/submissions",
      icon: ClipboardCheck,
      permission: "GRADE_SUBMISSIONS",
    },
    {
      name: "เช็กชื่อกิจกรรม",
      href: "/admin/attendance",
      icon: Calendar,
      permission: "MANAGE_ATTENDANCE",
    },
    {
      name: "รายชื่อนักเรียนในชุมนุม",
      href: "/admin/students",
      icon: Users,
      permission: "MANAGE_STUDENTS",
    },
    {
      name: "ประวัติการออกรายงาน",
      href: "/admin/reports",
      icon: FileText,
      permission: "VIEW_REPORTS",
    },
    {
      name: "จัดการบัญชีผู้ใช้ (Users)",
      href: "/admin/users",
      icon: UserCog,
      permission: "MANAGE_USERS",
    },
    {
      name: "บันทึกประวัติ (Audit Logs)",
      href: "/admin/logs",
      icon: History,
      permission: "VIEW_AUDIT_LOGS",
    },
    {
      name: "ข้อมูลส่วนตัว (Profile)",
      href: "/admin/profile",
      icon: UserCheck,
    },
    {
      name: "ตั้งค่าระบบ (Settings)",
      href: "/admin/settings",
      icon: Settings,
      permission: "MANAGE_SETTINGS",
    },
  ];

  // กรองเมนูตามสิทธิ์ที่ผู้ใช้ได้รับ
  const allowedNavItems = navItems.filter((item) => {
    if (!item.permission) return true;
    return hasAdminPermission(userObj, item.permission);
  });

  const roleMeta = ROLE_LABELS[adminRole || "TEACHER"] || ROLE_LABELS.TEACHER;

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white px-4 py-3 border-b border-[#EADBCC] shadow-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#B94E48] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            3S
          </div>
          <div>
            <span className="font-bold text-sm text-[#3F342B]">3S Party</span>
            <span className="block text-[10px] text-[#7A6A5C] -mt-0.5">Admin Studio</span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-xl border border-[#EADBCC] text-[#3F342B] hover:bg-[#FAF6F0] transition-colors cursor-pointer"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container: Fixed viewport height with independent scroll */}
      <aside
        className={`fixed top-0 left-0 z-40 w-64 bg-white border-r border-[#EADBCC] flex flex-col h-screen h-dvh transition-transform duration-300 ease-in-out md:sticky md:top-0 md:translate-x-0 shrink-0 overflow-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Branding (Fixed/Pinned) */}
        <div className="p-6 border-b border-[#EADBCC] flex items-center gap-3 shrink-0 bg-white">
          <div className="w-10 h-10 rounded-2xl bg-[#B94E48] text-white flex items-center justify-center shadow-md shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <h2 className="font-extrabold text-[#3F342B] text-base leading-tight tracking-tight">
              3S Party
            </h2>
            <p className="text-xs text-[#7A6A5C] flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 text-[#D9A441]" />
              Admin Studio
            </p>
          </div>
        </div>

        {/* Middle Independent Scrollable Menu Container */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-3">
          {/* User Tag */}
          <div className="p-3 rounded-2xl bg-[#FFF9F0] border border-[#EADBCC] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D9A441]/20 text-[#D9A441] flex items-center justify-center font-bold text-sm shrink-0">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-[#3F342B] truncate">{adminName}</p>
              <span
                className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md border mt-0.5 ${roleMeta.badgeColor}`}
              >
                {roleMeta.label.split(" (")[0]}
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              let isActive = pathname === item.href;
              if (!isActive && item.href !== "/admin/dashboard") {
                if (item.href === "/admin/assignments") {
                  isActive =
                    pathname.startsWith("/admin/assignments/") &&
                    pathname !== "/admin/assignments/new";
                } else {
                  isActive = pathname.startsWith(item.href + "/");
                }
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#B94E48] text-white shadow-sm"
                      : "text-[#5A4D41] hover:bg-[#FFF9F0] hover:text-[#B94E48]"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-[#A8988B]"}`} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Logout (Fixed/Pinned) */}
        <div className="p-4 border-t border-[#EADBCC] bg-white shrink-0">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#B94E48] bg-red-50 border border-red-100 hover:bg-red-100/80 active:scale-[0.99] transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          </form>
          <p className="text-[10px] text-center text-[#B5A597] mt-3">
            ชุมนุมสื่อสร้างสรรค์ v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
