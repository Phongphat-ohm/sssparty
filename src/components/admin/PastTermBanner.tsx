"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { History, RotateCcw, AlertTriangle } from "lucide-react";
import { resetAdminTermAction } from "@/actions/term";

interface PastTermBannerProps {
  selectedTerm: string;
  currentTerm: string;
}

export function PastTermBanner({ selectedTerm, currentTerm }: PastTermBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleReset = () => {
    startTransition(async () => {
      await resetAdminTermAction();
      router.refresh();
    });
  };

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-xs z-10 shrink-0 border-b border-amber-600 animate-in fade-in duration-150">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-amber-100 shrink-0" />
        <span>
          <strong>โหมดดูข้อมูลย้อนหลัง:</strong> ขณะนี้กำลังแสดงข้อมูลของภาคเรียน{" "}
          <span className="font-bold underline text-white px-1 py-0.5 bg-amber-600/60 rounded">
            {selectedTerm}
          </span>{" "}
          (ภาคเรียนปัจจุบันของระบบคือ {currentTerm})
        </span>
      </div>
      <button
        type="button"
        onClick={handleReset}
        disabled={isPending}
        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-50 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
      >
        <RotateCcw className="w-3 h-3" />
        <span>กลับสู่เทอมปัจจุบัน</span>
      </button>
    </div>
  );
}
