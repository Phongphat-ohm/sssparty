"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LogOut, BookOpen, LayoutDashboard, Sparkles, User, Calendar } from "lucide-react";
import { logoutAction } from "@/actions/auth";

interface StudentNavbarProps {
  studentName: string;
  studentCode: string;
  className: string;
  studentNumber: number;
}

export function StudentNavbar({
  studentName,
  studentCode,
  className,
  studentNumber,
}: StudentNavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    {
      name: "ห้องเรียน",
      href: "/student/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "ภาระงาน",
      href: "/student/assignments",
      icon: BookOpen,
    },
    {
      name: "การเข้าเรียน",
      href: "/student/attendance",
      icon: Calendar,
    },
    {
      name: "ข้อมูลส่วนตัว",
      href: "/student/profile",
      icon: User,
    },
  ];

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-[#EADBCC] sticky top-0 z-30 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        {/* Brand */}
        <Link href="/student/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#D9A441] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base text-[#3F342B] tracking-tight">
                SSSParty
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold bg-[#FAF0E1] text-[#8C5D23] px-2 py-0.5 rounded-full border border-[#EADBCC]">
                นักเรียน
              </span>
            </div>
            <span className="block text-[10px] sm:text-[11px] text-[#7A6A5C] -mt-0.5">
              ชุมนุมสื่อสร้างสรรค์
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-[#FFF9F0] p-1 rounded-xl border border-[#EADBCC]">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#D9A441] text-white shadow-xs"
                    : "text-[#5A4D41] hover:text-[#D9A441]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Student Badge & Logout */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-[#3F342B] truncate max-w-[150px]">
              {studentName}
            </p>
            <p className="text-[10px] text-[#7A6A5C]">
              {className} เลขที่ {studentNumber} ({studentCode})
            </p>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-[#D9CABB] text-[#7A6A5C] hover:text-[#B94E48] hover:border-[#B94E48] active:scale-95 transition-all cursor-pointer"
              title="ออกจากระบบ"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ออก</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
