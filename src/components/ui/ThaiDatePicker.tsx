"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatThaiDate } from "@/lib/utils/date-thai";

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

export interface ThaiDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

export function ThaiDatePicker({
  value,
  onChange,
  name,
  id,
  required = false,
  disabled = false,
  placeholder = "เลือกวันที่...",
  className = "",
  minDate,
  maxDate,
}: ThaiDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view year and month
  const parseInitialDate = () => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return { year: y, month: m - 1, day: d };
    }
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      day: today.getDate(),
    };
  };

  const initial = parseInitialDate();
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  // Sync view when value changes
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
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

  const handleSelectDate = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    onChange(todayStr);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setIsOpen(false);
  };

  // Generate Year Options: 5 years past to 5 years future in Buddhist Year (พ.ศ.)
  const currentCEYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  for (let y = currentCEYear - 4; y <= currentCEYear + 6; y++) {
    yearOptions.push(y);
  }

  // Selected date comparison
  const isSelected = (d: number) => {
    if (!value) return false;
    const [y, m, day] = value.split("-").map(Number);
    return y === viewYear && m - 1 === viewMonth && day === d;
  };

  const isToday = (d: number) => {
    const now = new Date();
    return (
      now.getFullYear() === viewYear &&
      now.getMonth() === viewMonth &&
      now.getDate() === d
    );
  };

  // Format display text
  const displayLabel = value ? formatThaiDate(value, { variant: "long" }) : "";

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Hidden input for Native Form Submit */}
      {name && <input type="hidden" name={name} value={value || ""} required={required} />}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-[42px] flex items-center justify-between px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:border-[#D9A441]/60 text-left font-sans shadow-2xs"
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar className="w-4 h-4 text-[#8C5D23] shrink-0" />
          <span className={value ? "font-medium text-[#3F342B]" : "text-[#A8988B]"}>
            {value ? displayLabel : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && !required && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-1 hover:bg-[#EADBCC] rounded-full text-[#7A6A5C] hover:text-[#3F342B] transition-colors"
              title="ล้างวันที่"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <span className="text-[11px] font-bold text-[#8C5D23] px-2 py-0.5 rounded-md bg-[#FAF0E1] border border-[#D9CABB]/60">
            พ.ศ.
          </span>
        </div>
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-72 sm:w-80 p-3.5 bg-white rounded-2xl shadow-xl border border-[#D9CABB] animate-in fade-in zoom-in-95 duration-150">
          {/* Header Month / Year Selectors */}
          <div className="flex items-center justify-between gap-1 mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-[#FAF0E1] rounded-lg text-[#5A4D41] hover:text-[#8C5D23] transition-colors cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Month Select */}
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

              {/* Year Select (in Buddhist Year พ.ศ.) */}
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
              className="p-1.5 hover:bg-[#FAF0E1] rounded-lg text-[#5A4D41] hover:text-[#8C5D23] transition-colors cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAY_NAMES.map((w, idx) => (
              <span
                key={w}
                className={`text-[11px] font-semibold ${
                  idx === 0 ? "text-rose-500" : idx === 6 ? "text-indigo-500" : "text-[#7A6A5C]"
                }`}
              >
                {w}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots before day 1 */}
            {Array.from({ length: firstDayOfWeek(viewYear, viewMonth) }).map((_, i) => (
              <span key={`empty-${i}`} className="h-8 w-8" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth(viewYear, viewMonth) }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const today = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDate(day)}
                  className={`h-8 w-8 sm:h-9 sm:w-9 mx-auto rounded-xl flex items-center justify-center text-xs font-medium transition-all cursor-pointer ${
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

          {/* Footer: Quick "วันนี้" Button */}
          <div className="mt-3 pt-2.5 border-t border-[#F2E8DC] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-[11px] font-bold text-[#8C5D23] hover:text-[#5C4A3A] px-2 py-1 rounded-lg hover:bg-[#FAF0E1] transition-colors cursor-pointer"
            >
              เลือกวันนี้ ({formatThaiDate(new Date())})
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-medium text-[#7A6A5C] hover:text-[#3F342B] px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
