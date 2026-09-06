"use client";

import { useEffect, useState } from "react";
import { Clock, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

interface MaintenanceCountdownProps {
  targetTime?: string;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isValidDate: boolean;
  thaiFormattedDate: string;
}

function calculateTimeRemaining(targetTimeStr?: string): TimeRemaining | null {
  if (!targetTimeStr || !targetTimeStr.trim()) return null;

  const targetDate = new Date(targetTimeStr);
  const isValidDate = !isNaN(targetDate.getTime());

  if (!isValidDate) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: false,
      isValidDate: false,
      thaiFormattedDate: targetTimeStr,
    };
  }

  const diff = targetDate.getTime() - Date.now();

  const thaiFormattedDate =
    targetDate.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    " เวลา " +
    targetDate.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }) +
    " น.";

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isValidDate: true,
      thaiFormattedDate,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    isValidDate: true,
    thaiFormattedDate,
  };
}

export function MaintenanceCountdown({
  targetTime,
  className = "",
}: MaintenanceCountdownProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<TimeRemaining | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeLeft(calculateTimeRemaining(targetTime));

    if (!targetTime) return;

    const interval = setInterval(() => {
      const updated = calculateTimeRemaining(targetTime);
      setTimeLeft(updated);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  if (!targetTime || !targetTime.trim()) {
    return null;
  }

  // ป้องกัน Hydration mismatch ระหว่าง Server กับ Client
  if (!mounted || !timeLeft) {
    return (
      <div className={`p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] text-center text-xs text-[#7A6A5C] ${className}`}>
        <div className="flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-[#D9A441]" />
          <span>กำหนดการเปิดให้บริการ: {targetTime}</span>
        </div>
      </div>
    );
  }

  // กรณีเป็นข้อความอิสระที่ไม่ใช่วันที่/เวลามาตรฐาน
  if (!timeLeft.isValidDate) {
    return (
      <div className={`p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] flex items-center justify-center gap-2.5 text-xs sm:text-sm text-[#5A4D41] font-medium ${className}`}>
        <Clock className="w-4.5 h-4.5 text-[#D9A441] shrink-0" />
        <span>
          คาดว่าจะเปิดให้บริการตามปกติ:{" "}
          <strong className="text-[#3F342B] font-bold">
            {timeLeft.thaiFormattedDate}
          </strong>
        </span>
      </div>
    );
  }

  // กรณีหมดเวลาแล้ว (Countdown ถึง 0)
  if (timeLeft.isExpired) {
    return (
      <div className={`p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-300 text-center space-y-3 shadow-xs ${className}`}>
        <div className="flex items-center justify-center gap-2 text-amber-800 font-bold text-sm">
          <Sparkles className="w-4 h-4 text-amber-600 animate-bounce" />
          <span>ถึงกำหนดเวลาเปิดให้บริการแล้ว</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          ครบกำหนดเวลา ({timeLeft.thaiFormattedDate}) เรียบร้อยแล้ว หากยังไม่สามารถเข้าใช้งานได้ โปรดรอผู้ดูแลระบบดำเนินการเปิดระบบสักครู่
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#D9A441] hover:bg-[#C28F30] active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{isRefreshing ? "กำลังโหลด..." : "โหลดหน้านี้ใหม่"}</span>
        </button>
      </div>
    );
  }

  // กรณีกำลังนับถอยหลัง (Active Countdown)
  const showDays = timeLeft.days > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* เวลาเป้าหมายภาษาไทย */}
      <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-[#5A4D41] font-medium">
        <Clock className="w-4 h-4 text-[#D9A441] shrink-0 animate-spin-slow" />
        <span>
          คาดว่าจะเปิดระบบ:{" "}
          <strong className="text-[#3F342B] font-bold">
            {timeLeft.thaiFormattedDate}
          </strong>
        </span>
      </div>

      {/* กล่องตัวเลขนับถอยหลัง */}
      <div className={`grid ${showDays ? "grid-cols-4" : "grid-cols-3"} gap-2 sm:gap-3 max-w-sm mx-auto`}>
        {showDays && (
          <div className="bg-[#FAF6F0] border border-[#EADBCC] rounded-2xl p-2.5 sm:p-3 text-center shadow-xs">
            <span className="block text-xl sm:text-2xl font-extrabold text-[#3F342B] font-mono leading-none">
              {String(timeLeft.days).padStart(2, "0")}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-[#8C5D23] uppercase mt-1 block">
              วัน
            </span>
          </div>
        )}

        <div className="bg-[#FAF6F0] border border-[#EADBCC] rounded-2xl p-2.5 sm:p-3 text-center shadow-xs">
          <span className="block text-xl sm:text-2xl font-extrabold text-[#3F342B] font-mono leading-none">
            {String(timeLeft.hours).padStart(2, "0")}
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-[#8C5D23] uppercase mt-1 block">
            ชั่วโมง
          </span>
        </div>

        <div className="bg-[#FAF6F0] border border-[#EADBCC] rounded-2xl p-2.5 sm:p-3 text-center shadow-xs">
          <span className="block text-xl sm:text-2xl font-extrabold text-[#3F342B] font-mono leading-none">
            {String(timeLeft.minutes).padStart(2, "0")}
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-[#8C5D23] uppercase mt-1 block">
            นาที
          </span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 sm:p-3 text-center shadow-xs">
          <span className="block text-xl sm:text-2xl font-extrabold text-amber-700 font-mono leading-none">
            {String(timeLeft.seconds).padStart(2, "0")}
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-amber-800 uppercase mt-1 block">
            วินาที
          </span>
        </div>
      </div>
    </div>
  );
}
