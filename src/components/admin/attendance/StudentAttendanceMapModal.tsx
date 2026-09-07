"use client";

import { X, MapPin } from "lucide-react";
import { StudentAttendanceMap, StudentMapRecord } from "./StudentAttendanceMap";

interface StudentAttendanceMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionTitle: string;
  records: StudentMapRecord[];
  centerCoords?: {
    latitude: number;
    longitude: number;
    expectedRadius?: number;
  } | null;
}

export function StudentAttendanceMapModal({
  isOpen,
  onClose,
  sessionTitle,
  records,
  centerCoords,
}: StudentAttendanceMapModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-stone-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/90">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                แผนที่แสดงหมุดพิกัดนักเรียนที่เช็กชื่อ (Student Attendance Map)
              </h2>
              <p className="text-xs text-stone-500">
                คาบเรียน: {sessionTitle} • คลิกที่หมุดนักเรียนเพื่อดูชื่อ เลขที่ เวลา และระยะห่าง
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Body */}
        <div className="p-4 flex-1 overflow-y-auto">
          <StudentAttendanceMap
            records={records}
            centerCoords={centerCoords}
            height="580px"
          />
        </div>
      </div>
    </div>
  );
}
