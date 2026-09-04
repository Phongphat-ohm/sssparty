"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  PlusCircle,
  Calendar,
  LogOut,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";

interface AdminNavbarProps {
  adminName: string;
}

export function AdminNavbar({ adminName }: AdminNavbarProps) {
  const pathname = usePathname();

  // Dynamic breadcrumb mapping
  const getPageTitle = (path: string) => {
    if (path === "/admin/dashboard") return "ภาพรวมระบบ (Dashboard)";
    if (path === "/admin/assignments") return "การบ้านทั้งหมด";
    if (path === "/admin/assignments/new") return "สร้างการบ้านใหม่";
    if (path.startsWith("/admin/assignments/") && path.endsWith("/edit"))
      return "แก้ไขการบ้าน";
    if (path.startsWith("/admin/assignments/") && path.endsWith("/submissions"))
      return "รายการส่งงานของการบ้าน";
    if (path === "/admin/submissions") return "ห้องตรวจงาน (Grading Studio)";
    if (path.startsWith("/admin/submissions/")) return "ห้องตรวจงานรายบุคคล";
    if (path === "/admin/students") return "รายชื่อสมาชิกชุมนุม";
    if (path === "/admin/users") return "จัดการบัญชีผู้ใช้ (User Management)";
    if (path === "/admin/attendance") return "ระบบเช็กชื่อกิจกรรม";
    if (path.startsWith("/admin/attendance/")) return "ห้องเช็กชื่อกิจกรรม";
    if (path === "/admin/settings") return "ตั้งค่าระบบ & รหัสผ่าน";
    return "Admin Studio";
  };

  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#EADBCC] px-4 sm:px-8 py-3 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
      {/* Left: Breadcrumb & Title */}
      <div className="flex items-center gap-2 overflow-hidden">
        <div className="flex items-center gap-1.5 text-xs text-[#7A6A5C]">
          <span className="font-semibold hidden sm:inline">3S Party</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#D9CABB] hidden sm:inline" />
          <span className="font-bold text-[#3F342B] truncate">{pageTitle}</span>
        </div>

        <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ระบบออนไลน์
        </span>
      </div>

      {/* Right: Quick Actions & Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quick Link: New Assignment */}
        <Link
          href="/admin/assignments/new"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#B94E48] hover:bg-[#A33F39] active:scale-95 transition-all shadow-xs"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>สร้างงานใหม่</span>
        </Link>

        {/* Semester Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF6F0] border border-[#EADBCC] text-xs text-[#5A4D41]">
          <Calendar className="w-3.5 h-3.5 text-[#D9A441]" />
          <span className="font-semibold text-[11px]">ภาคเรียน 1/2569</span>
        </div>

        {/* User Info Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#F2E8DC]">
          <div className="w-8 h-8 rounded-xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center font-bold text-xs border border-[#EADBCC]">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-[#3F342B] leading-tight truncate max-w-[120px]">
              {adminName}
            </p>
            <span className="text-[10px] text-[#B94E48] font-semibold">
              อาจารย์ผู้สอน
            </span>
          </div>
        </div>

        {/* Quick Logout Button */}
        <form action={logoutAction}>
          <button
            type="submit"
            title="ออกจากระบบ"
            className="p-2 rounded-xl text-[#7A6A5C] hover:text-[#B94E48] hover:bg-red-50 border border-transparent hover:border-red-100 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
