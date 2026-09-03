"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, User, Calendar } from "lucide-react";

interface StudentBottomNavProps {
  studentName: string;
  className: string;
  studentNumber: number;
}

export function StudentBottomNav({
  studentName,
  className,
  studentNumber,
}: StudentBottomNavProps) {
  const pathname = usePathname();

  const tabs = [
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
      name: "เข้าเรียน",
      href: "/student/attendance",
      icon: Calendar,
    },
    {
      name: "โปรไฟล์",
      href: "/student/profile",
      icon: User,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#EADBCC] px-6 py-2 shadow-lg">
      <div className="flex items-center justify-around max-w-sm mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
                isActive
                  ? "text-[#D9A441] font-bold"
                  : "text-[#8C7B6E] hover:text-[#D9A441]"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? "bg-[#FAF0E1] text-[#D9A441]" : ""
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px]">{tab.name}</span>
            </Link>
          );
        })}

        {/* Quick Profile indicator on mobile */}
        <div className="flex flex-col items-center gap-1 py-1 px-4 text-[#8C7B6E]">
          <div className="p-1.5 rounded-xl bg-[#FAF6F0] border border-[#EADBCC] text-[#3F342B] font-bold text-xs w-8 h-8 flex items-center justify-center">
            {studentNumber}
          </div>
          <span className="text-[11px] truncate max-w-[60px]">{className}</span>
        </div>
      </div>
    </nav>
  );
}
