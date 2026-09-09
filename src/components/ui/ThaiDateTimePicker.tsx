"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { formatThaiDate, formatThaiDateTime } from "@/lib/utils/date-thai";

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const WEEKDAY_NAMES = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export interface ThaiDateTimePickerProps {
  value: string; // "YYYY-MM-DDTHH:mm" or ISO string
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  showQuickPresets?: boolean;
}

export function ThaiDateTimePicker({
  value,
  onChange,
  name,
  id,
  disabled = false,
  required = false,
  placeholder = "เลือกกำหนดส่งงาน...",
  className = "",
  showQuickPresets = true,
}: ThaiDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse incoming value into date parts and time parts
  const parseDateTime = (val: string) => {
    if (!val) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      return {
        year: now.getFullYear(),
        month: now.getMonth(),
        day: now.getDate(),
        hour: "23",
        minute: "59",
      };
    }

    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        return {
          year: d.getFullYear(),
          month: d.getMonth(),
          day: d.getDate(),
          hour: pad(d.getHours()),
          minute: pad(d.getMinutes()),
        };
      }
    } catch {}

    if (val.includes("T")) {
      const [dPart, tPart] = val.split("T");
      const [y, m, day] = dPart.split("-").map(Number);
      const [h = "23", min = "59"] = (tPart || "").split(":");
      return {
        year: y || new Date().getFullYear(),
        month: (m || 1) - 1,
        day: day || 1,
        hour: h.padStart(2, "0"),
        minute: min.slice(0, 2).padStart(2, "0"),
      };
    }

    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      day: today.getDate(),
      hour: "23",
      minute: "59",
    };
  };

  const initial = parseDateTime(value);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [selectedYear, setSelectedYear] = useState(initial.year);
  const [selectedMonth, setSelectedMonth] = useState(initial.month);
  const [selectedDay, setSelectedDay] = useState(initial.day);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);

  // Sync state with incoming value
  useEffect(() => {
    if (value) {
      const parsed = parseDateTime(value);
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
      setSelectedYear(parsed.year);
      setSelectedMonth(parsed.month);
      setSelectedDay(parsed.day);
      setHour(parsed.hour);
      setMinute(parsed.minute);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const emitValue = (y: number, m: number, d: number, h: string, min: string) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatted = `${y}-${pad(m + 1)}-${pad(d)}T${h}:${min}`;
    onChange(formatted);
  };

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfWeek = (y: number, m: number) => new Date(y, m, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    setSelectedYear(viewYear);
    setSelectedMonth(viewMonth);
    setSelectedDay(day);
    emitValue(viewYear, viewMonth, day, hour, minute);
  };

  const handleHourChange = (newH: string) => {
    const padH = newH.padStart(2, "0");
    setHour(padH);
    emitValue(selectedYear, selectedMonth, selectedDay, padH, minute);
  };

  const handleMinuteChange = (newMin: string) => {
    const padMin = newMin.padStart(2, "0");
    setMinute(padMin);
    emitValue(selectedYear, selectedMonth, selectedDay, hour, padMin);
  };

  const handleQuickPreset = (daysFromNow: number, targetTime = "23:59") => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const [h, min] = targetTime.split(":");
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();

    setViewYear(y);
    setViewMonth(m);
    setSelectedYear(y);
    setSelectedMonth(m);
    setSelectedDay(day);
    setHour(h);
    setMinute(min);

    emitValue(y, m, day, h, min);
  };

  // Generate Year Options in Buddhist Year (พ.ศ.)
  const currentCEYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  for (let y = currentCEYear - 4; y <= currentCEYear + 6; y++) {
    yearOptions.push(y);
  }

  // 24 Hour Options (00 to 23)
  const hourOptions = Array.from({ length: 24 }).map((_, i) => String(i).padStart(2, "0"));
  // Minute Options (00 to 59 by 5-step, plus common ones)
  const minuteOptions = Array.from({ length: 60 }).map((_, i) => String(i).padStart(2, "0"));

  const isSelected = (day: number) => {
    return (
      selectedYear === viewYear &&
      selectedMonth === viewMonth &&
      selectedDay === day
    );
  };

  const isToday = (day: number) => {
    const now = new Date();
    return (
      now.getFullYear() === viewYear &&
      now.getMonth() === viewMonth &&
      now.getDate() === day
    );
  };

  // Formatted display string for input button
  const pad = (n: number) => String(n).padStart(2, "0");
  const currentIsoString = value
    ? value
    : `${selectedYear}-${pad(selectedMonth + 1)}-${pad(selectedDay)}T${hour}:${minute}`;
  const displayText = value ? formatThaiDateTime(value) : "";

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Hidden input for Native Form Submit */}
      {name && <input type="hidden" name={name} value={value || ""} required={required} />}

      {/* Main Single Trigger Input Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-[42px] flex items-center justify-between px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:border-[#D9A441]/70 text-left font-sans shadow-2xs"
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar className="w-4 h-4 text-[#8C5D23] shrink-0" />
          <span className={value ? "font-semibold text-[#3F342B] truncate" : "text-[#A8988B]"}>
            {value ? displayText : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          <span className="text-[10px] font-bold text-[#8C5D23] px-1.5 py-0.5 rounded bg-[#FAF0E1] border border-[#D9CABB]/60">
            พ.ศ. / 24 ชม.
          </span>
          <ChevronDown
            className={`w-4 h-4 text-[#7A6A5C] transition-transform duration-150 ${
              isOpen ? "rotate-180 text-[#8C5D23]" : ""
            }`}
          />
        </div>
      </button>

      {/* Popover Dropdown Picker */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 left-0 right-0 sm:right-auto sm:w-[330px] p-3.5 bg-white rounded-2xl shadow-xl border border-[#D9CABB] animate-in fade-in zoom-in-95 duration-150 font-sans">
          {/* Calendar Header: Month / Buddhist Year */}
          <div className="flex items-center justify-between gap-1 mb-2.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-[#FAF0E1] rounded-lg text-[#5A4D41] hover:text-[#8C5D23] transition-colors cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="px-2 py-1 bg-[#FAF6F0] border border-[#D9CABB] rounded-lg text-xs font-bold text-[#3F342B] focus:outline-none focus:ring-1 focus:ring-[#D9A441] cursor-pointer"
              >
                {THAI_MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="px-2 py-1 bg-[#FAF6F0] border border-[#D9CABB] rounded-lg text-xs font-bold text-[#8C5D23] focus:outline-none focus:ring-1 focus:ring-[#D9A441] cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y + 543}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-[#FAF0E1] rounded-lg text-[#5A4D41] hover:text-[#8C5D23] transition-colors cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAY_NAMES.map((w, idx) => (
              <span
                key={w}
                className={`text-[10px] font-semibold ${
                  idx === 0 ? "text-rose-500" : idx === 6 ? "text-indigo-500" : "text-[#7A6A5C]"
                }`}
              >
                {w}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek(viewYear, viewMonth) }).map((_, i) => (
              <span key={`empty-${i}`} className="h-7 w-7" />
            ))}

            {Array.from({ length: daysInMonth(viewYear, viewMonth) }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const today = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center text-xs transition-all cursor-pointer ${
                    selected
                      ? "bg-[#D9A441] text-white font-bold shadow-xs scale-105"
                      : today
                      ? "bg-[#FAF0E1] text-[#8C5D23] font-bold border border-[#D9A441]/50 hover:bg-[#D9A441] hover:text-white"
                      : "text-[#3F342B] hover:bg-[#FAF0E1] hover:text-[#8C5D23]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* 24-Hour Time Row */}
          <div className="mt-2.5 p-2 rounded-xl bg-[#FAF6F0] border border-[#EADBCC] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#8C5D23]" />
              <span>เวลา (24 ชม.):</span>
            </span>

            <div className="flex items-center gap-1 font-mono text-xs">
              <select
                value={hour}
                onChange={(e) => handleHourChange(e.target.value)}
                className="bg-white border border-[#D9CABB] rounded-lg px-2 py-1 font-bold text-[#3F342B] focus:outline-none focus:ring-1 focus:ring-[#D9A441] cursor-pointer"
                title="ชั่วโมง (00-23)"
              >
                {hourOptions.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>

              <span className="font-bold text-[#8C5D23]">:</span>

              <select
                value={minute}
                onChange={(e) => handleMinuteChange(e.target.value)}
                className="bg-white border border-[#D9CABB] rounded-lg px-2 py-1 font-bold text-[#3F342B] focus:outline-none focus:ring-1 focus:ring-[#D9A441] cursor-pointer"
                title="นาที (00-59)"
              >
                {minuteOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <span className="text-xs font-semibold text-[#8C5D23] pl-1 font-sans">น.</span>
            </div>
          </div>

          {/* Quick Presets for Deadlines */}
          {showQuickPresets && (
            <div className="mt-2 pt-2 border-t border-[#F2E8DC] space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#8C5D23]">
                <Sparkles className="w-3 h-3 text-[#D9A441]" />
                <span>ตั้งกำหนดด่วน:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickPreset(0, "23:59")}
                  className="px-2 py-0.5 rounded-lg text-[11px] bg-[#FAF6F0] border border-[#D9CABB] text-[#5A4D41] hover:bg-[#FAF0E1] hover:text-[#8C5D23] transition-colors cursor-pointer"
                >
                  วันนี้ 23:59
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset(1, "23:59")}
                  className="px-2 py-0.5 rounded-lg text-[11px] bg-[#FAF6F0] border border-[#D9CABB] text-[#5A4D41] hover:bg-[#FAF0E1] hover:text-[#8C5D23] transition-colors cursor-pointer"
                >
                  พรุ่งนี้ 23:59
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset(3, "23:59")}
                  className="px-2 py-0.5 rounded-lg text-[11px] bg-[#FAF6F0] border border-[#D9CABB] text-[#5A4D41] hover:bg-[#FAF0E1] hover:text-[#8C5D23] transition-colors cursor-pointer"
                >
                  +3 วัน
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset(7, "23:59")}
                  className="px-2 py-0.5 rounded-lg text-[11px] bg-[#FAF0E1] border border-[#D9A441] text-[#8C5D23] font-bold hover:bg-[#D9A441] hover:text-white transition-all cursor-pointer shadow-2xs"
                >
                  +7 วัน (1 สัปดาห์)
                </button>
              </div>
            </div>
          )}

          {/* Footer Preview & Done Button */}
          <div className="mt-3 pt-2 border-t border-[#F2E8DC] flex items-center justify-between">
            <div className="text-[11px] text-[#7A6A5C] truncate pr-2">
              <span>เลือก: </span>
              <strong className="text-[#8C5D23]">
                {formatThaiDateTime(currentIsoString)}
              </strong>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-[#D9A441] hover:bg-[#C28F30] text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer shrink-0"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
