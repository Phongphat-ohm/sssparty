"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export interface ThaiTimeInputProps {
  value: string; // "HH:mm" (24-hour clock)
  onChange: (timeStr: string) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  showPresets?: boolean;
}

const DEFAULT_PRESETS = ["08:00", "08:30", "12:00", "16:00", "18:00", "23:59"];

export function ThaiTimeInput({
  value,
  onChange,
  name,
  id,
  disabled = false,
  required = false,
  placeholder = "08:30",
  className = "",
  showPresets = true,
}: ThaiTimeInputProps) {
  // Parse hours and minutes
  const [hours, setHours] = useState("08");
  const [minutes, setMinutes] = useState("30");

  useEffect(() => {
    if (value && value.includes(":")) {
      const [h, m] = value.split(":");
      setHours(h.padStart(2, "0"));
      setMinutes(m.padStart(2, "0"));
    }
  }, [value]);

  const handleHourChange = (newH: string) => {
    const padH = newH.padStart(2, "0");
    setHours(padH);
    onChange(`${padH}:${minutes}`);
  };

  const handleMinuteChange = (newM: string) => {
    const padM = newM.padStart(2, "0");
    setMinutes(padM);
    onChange(`${hours}:${padM}`);
  };

  const handlePresetClick = (presetTime: string) => {
    const [h, m] = presetTime.split(":");
    setHours(h);
    setMinutes(m);
    onChange(presetTime);
  };

  // Generate 24 hours (00 to 23)
  const hourOptions = Array.from({ length: 24 }).map((_, i) => String(i).padStart(2, "0"));

  // Generate minutes (00 to 55 by 5-step, or full 00 to 59)
  const minuteOptions = Array.from({ length: 60 }).map((_, i) => String(i).padStart(2, "0"));

  return (
    <div className={`space-y-2 ${className}`}>
      {name && <input type="hidden" name={name} value={value || `${hours}:${minutes}`} required={required} />}

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 h-[42px] rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus-within:ring-2 focus-within:ring-[#D9A441] transition-all shadow-2xs">
          <Clock className="w-4 h-4 text-[#8C5D23] shrink-0" />

          {/* Hour Selector (00 - 23) */}
          <select
            id={id ? `${id}-hour` : undefined}
            disabled={disabled}
            value={hours}
            onChange={(e) => handleHourChange(e.target.value)}
            className="bg-transparent font-bold text-[#3F342B] focus:outline-none cursor-pointer text-center"
            title="ชั่วโมง (00 - 23)"
          >
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>

          <span className="font-bold text-[#8C5D23]">:</span>

          {/* Minute Selector (00 - 59) */}
          <select
            id={id ? `${id}-minute` : undefined}
            disabled={disabled}
            value={minutes}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="bg-transparent font-bold text-[#3F342B] focus:outline-none cursor-pointer text-center"
            title="นาที (00 - 59)"
          >
            {minuteOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <span className="text-xs font-semibold text-[#8C5D23] pl-1">น.</span>
        </div>

        <span className="text-[11px] font-bold text-[#8C5D23] px-2 py-1 rounded-md bg-[#FAF0E1] border border-[#D9CABB]/60 shrink-0">
          24 ชม.
        </span>
      </div>

      {/* Preset Quick Buttons */}
      {showPresets && !disabled && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-[#7A6A5C] mr-1">เลือกเวลาด่วน:</span>
          {DEFAULT_PRESETS.map((p) => {
            const isCurrent = value === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePresetClick(p)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-[#D9A441] text-white font-bold"
                    : "bg-white border border-[#D9CABB] text-[#5A4D41] hover:bg-[#FAF0E1] hover:text-[#8C5D23]"
                }`}
              >
                {p} น.
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
