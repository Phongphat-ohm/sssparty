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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#EADBCC] px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-lg">
      <div className="grid grid-cols-4 max-w-sm mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all cursor-pointer ${
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
              <span className="text-[10.5px] leading-none">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
