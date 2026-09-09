"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Calendar, ChevronDown, Check, RotateCcw, History, Search, CalendarRange, Loader2 } from "lucide-react";

import { showCozyError } from "@/lib/ui/swal";

interface AcademicTermSelectorProps {
  currentTerm: string;
  selectedTerm: string;
  availableTerms: string[];
}

export function AcademicTermSelector({
  currentTerm,
  selectedTerm,
  availableTerms,
}: AcademicTermSelectorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    right?: number;
    maxHeight: number;
    placement: "bottom" | "top";
  }>({ maxHeight: 420, placement: "bottom" });

  // ตรวจสอบความถูกต้องว่า currentTerm และ selectedTerm มีอยู่ใน availableTerms ที่ลงทะเบียนไว้จริงหรือไม่
  const effectiveCurrentTerm =
    availableTerms.length > 0 && availableTerms.includes(currentTerm)
      ? currentTerm
      : (availableTerms[0] || currentTerm);

  const effectiveSelectedTerm =
    availableTerms.length > 0 && availableTerms.includes(selectedTerm)
      ? selectedTerm
      : effectiveCurrentTerm;

  const isPastTerm = effectiveSelectedTerm !== effectiveCurrentTerm;

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom - 16;
    const spaceAbove = rect.top - 16;

    const placement = spaceBelow < 280 && spaceAbove > spaceBelow ? "top" : "bottom";
    const availableHeight = placement === "bottom" ? spaceBelow : spaceAbove;
    const maxHeight = Math.max(180, Math.min(availableHeight, 520));

    const menuW = menuRef.current?.offsetWidth || 288;
    const right = Math.max(8, Math.min(viewportWidth - rect.right, viewportWidth - menuW - 8));

    if (placement === "bottom") {
      setCoords({
        top: Math.round(rect.bottom + 6),
        right,
        maxHeight: Math.round(maxHeight),
        placement: "bottom",
      });
    } else {
      setCoords({
        bottom: Math.round(viewportHeight - rect.top + 6),
        right,
        maxHeight: Math.round(maxHeight),
        placement: "top",
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    } else {
      setSearchTerm("");
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  // Close dropdown when clicking outside (checks trigger button & portal menu)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectTerm = async (term: string) => {
    // หากเป็นเทอมเดิมที่กำลังดูอยู่ ให้ปิด Dropdown ทันที ไม่ต้องรีโหลดซ้ำ
    if (term === effectiveSelectedTerm) {
      setIsOpen(false);
      return;
    }

    // ป้องกันการสลับไปยังเทอมที่ไม่มีอยู่ในระบบอย่างเด็ดขาด
    if (!availableTerms.includes(term)) {
      showCozyError("ไม่สามารถเลือกภาคเรียนนี้ได้", "ภาคเรียนนี้ไม่มีอยู่ในระบบ ต้องสร้างผ่านศูนย์จัดการภาคเรียนก่อนเท่านั้น");
      return;
    }

    setIsOpen(false);
    setIsSwitching(true);
    try {
      const res = await fetch("/api/terms/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term }),
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        await showCozyError("ไม่สามารถสลับภาคเรียนได้", data.message);
      }
    } catch {
      router.refresh();
    } finally {
      setIsSwitching(false);
    }
  };

  const handleResetToCurrent = async () => {
    setIsOpen(false);
    setIsSwitching(true);
    try {
      const res = await fetch("/api/terms/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: effectiveCurrentTerm }),
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        await showCozyError("ไม่สามารถสลับภาคเรียนได้", data.message);
      }
    } catch {
      router.refresh();
    } finally {
      setIsSwitching(false);
    }
  };

  const filteredTerms = availableTerms.filter((term) =>
    term.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={isSwitching}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
          isPastTerm
            ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
            : "bg-[#FAF6F0] text-[#5A4D41] border-[#EADBCC] hover:bg-[#F2E8DC]"
        } ${isSwitching ? "opacity-60 pointer-events-none" : ""}`}
        title="สลับภาคเรียนที่ต้องการดูข้อมูล"
      >
        {isSwitching ? (
          <Loader2 className="w-3.5 h-3.5 text-[#D9A441] animate-spin" />
        ) : isPastTerm ? (
          <History className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
        ) : (
          <Calendar className="w-3.5 h-3.5 text-[#D9A441]" />
        )}
        <span className="text-[11px] sm:text-xs">
          ภาคเรียน <strong className="font-bold">{effectiveSelectedTerm}</strong>
        </span>
        {isPastTerm && (
          <span className="hidden xl:inline-block px-1.5 py-0.2 rounded text-[10px] bg-amber-200 text-amber-800 font-bold">
            ย้อนหลัง
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu rendered via Portal to avoid overflow clipping */}
      {isOpen && mounted && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                ...(coords.placement === "bottom" && coords.top !== undefined
                  ? { top: coords.top }
                  : {}),
                ...(coords.placement === "top" && coords.bottom !== undefined
                  ? { bottom: coords.bottom }
                  : {}),
                maxHeight: `${coords.maxHeight}px`,
                right: coords.right,
                zIndex: 99999,
              }}
              className="w-72 max-w-[calc(100vw-16px)] overflow-y-auto rounded-2xl bg-white border border-[#EADBCC] shadow-2xl ring-1 ring-black/10 p-2.5 animate-in fade-in zoom-in-95 duration-150 custom-scrollbar"
            >
              <div className="px-3 py-2 border-b border-[#F2E8DC] mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3F342B]">เลือกภาคเรียน</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF0E1] text-[#A26D14] font-medium">
                    ปัจจุบัน: {effectiveCurrentTerm}
                  </span>
                </div>
                <p className="text-[11px] text-[#7A6A5C] mt-0.5">
                  เลือกดูข้อมูลเฉพาะภาคเรียนที่มีอยู่ในระบบ
                </p>
              </div>

              {/* Quick reset button if on past term */}
              {isPastTerm && (
                <button
                  type="button"
                  onClick={handleResetToCurrent}
                  disabled={isSwitching}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 mb-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isSwitching ? "animate-spin" : ""}`} />
                  <span>กลับสู่ภาคเรียนปัจจุบัน ({effectiveCurrentTerm})</span>
                </button>
              )}

              {/* Search Filter Input */}
              {availableTerms.length > 3 && (
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-[#A89887] absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="ค้นหาภาคเรียน (เช่น 1/2569)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-[#EADBCC] focus:outline-none focus:border-[#D9A441] bg-[#FAF6F0]"
                  />
                </div>
              )}

              {/* Term List - Only shows registered terms */}
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filteredTerms.length > 0 ? (
                  filteredTerms.map((term) => {
                    const isSelected = term === effectiveSelectedTerm;
                    const isCurrent = term === effectiveCurrentTerm;
                    return (
                      <button
                        key={term}
                        type="button"
                        onClick={() => handleSelectTerm(term)}
                        disabled={isSwitching}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-all cursor-pointer disabled:opacity-50 ${
                          isSelected
                            ? "bg-[#FAF0E1] text-[#A26D14] font-bold border border-[#EADBCC]"
                            : "text-[#3F342B] hover:bg-[#FAF6F0]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className={`w-3.5 h-3.5 ${isSelected ? "text-[#D9A441]" : "text-[#A89887]"}`} />
                          <span>ภาคเรียน {term}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                              ปัจจุบัน
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#D9A441]" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="py-4 px-2 text-center text-xs">
                    <p className="font-bold text-[#7A6A5C]">ไม่พบภาคเรียน "{searchTerm}"</p>
                    <p className="text-[11px] text-[#A89887] mt-1">
                      ไม่อนุญาตให้ไปยังเทอมที่ไม่มีอยู่ในฐานข้อมูล
                    </p>
                  </div>
                )}
              </div>

              {/* Manage Terms Page Link */}
              <div className="mt-2 pt-2 border-t border-[#F2E8DC]">
                <Link
                  href="/admin/terms"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF6F0] hover:bg-[#F2E8DC] text-xs font-semibold text-[#5A4D41] border border-[#EADBCC] transition-colors"
                >
                  <CalendarRange className="w-3.5 h-3.5 text-[#D9A441]" />
                  <span>ศูนย์จัดการภาคเรียน & ล็อกข้อมูล</span>
                </Link>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
