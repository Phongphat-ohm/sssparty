"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Save,
  Loader2,
  Globe,
  Calendar,
  HardDrive,
  UserCheck,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { updateSystemSettingsAction } from "@/actions/settings";
import { SystemSettingsMap } from "@/lib/settings/system-settings";
import { showCozySuccess, showCozyError } from "@/lib/ui/swal";
import { MaintenanceCountdown } from "@/components/common/MaintenanceCountdown";

interface SystemSettingsFormProps {
  initialSettings: SystemSettingsMap;
  canManageSettings: boolean;
}

export function SystemSettingsForm({
  initialSettings,
  canManageSettings,
}: SystemSettingsFormProps) {
  const router = useRouter();

  // Form states
  const [maintenanceMode, setMaintenanceMode] = useState(
    initialSettings.maintenance_mode
  );
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    initialSettings.maintenance_message
  );
  const [maintenanceExpectedEnd, setMaintenanceExpectedEnd] = useState(
    initialSettings.maintenance_expected_end
  );
  const [siteName, setSiteName] = useState(initialSettings.site_name);
  const [academicTerm, setAcademicTerm] = useState(
    initialSettings.academic_term
  );
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(
    initialSettings.max_upload_size_mb
  );
  const [allowStudentNameEdit, setAllowStudentNameEdit] = useState(
    initialSettings.allow_student_name_edit
  );

  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canManageSettings) return;

    setIsPending(true);

    const formData = new FormData();
    formData.set("maintenance_mode", String(maintenanceMode));
    formData.set("maintenance_message", maintenanceMessage);
    formData.set("maintenance_expected_end", maintenanceExpectedEnd);
    formData.set("site_name", siteName);
    formData.set("academic_term", academicTerm);
    formData.set("max_upload_size_mb", String(maxUploadSizeMb));
    formData.set("allow_student_name_edit", String(allowStudentNameEdit));

    try {
      const res = await updateSystemSettingsAction(formData);
      if (res.success) {
        await showCozySuccess("บันทึกสำเร็จ!", res.message);
        router.refresh();
      } else {
        await showCozyError("ไม่สามารถบันทึกได้", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Maintenance Mode Section */}
      <div
        className={`rounded-3xl border p-6 sm:p-7 transition-all ${
          maintenanceMode
            ? "bg-amber-50/70 border-amber-300 shadow-sm"
            : "bg-white border-[#EADBCC] shadow-xs"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2E8DC] pb-5">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-2xs ${
                maintenanceMode
                  ? "bg-amber-500 text-white"
                  : "bg-[#FAF0E1] text-[#D9A441]"
              }`}
            >
              <Wrench className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#3F342B]">
                  โหมดปรับปรุงระบบ (Maintenance Mode)
                </h3>
                {maintenanceMode && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                    กำลังเปิดใช้งาน
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7A6A5C]">
                เมื่อเปิดใช้งาน นักเรียนจะไม่สามารถเข้าใช้งานหรือส่งงานได้
                แต่ครู/แอดมินยังคงเข้าสู่ระบบได้ตามปกติ
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              disabled={!canManageSettings || isPending}
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6.5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {/* Maintenance Message Inputs */}
        <div className="pt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5A4D41]">
              ข้อความประกาศปิดปรับปรุง
            </label>
            <textarea
              rows={2}
              disabled={!canManageSettings || isPending}
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="ระบุข้อความประกาศให้นักเรียนเห็นบนหน้าเว็บ..."
              className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60"
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>กำหนดเวลาที่คาดว่าจะเปิดระบบตามปกติ (สำหรับแสดงเวลานับถอยหลัง)</span>
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-lg">
                <input
                  type="datetime-local"
                  disabled={!canManageSettings || isPending}
                  value={(() => {
                    if (!maintenanceExpectedEnd) return "";
                    const d = new Date(maintenanceExpectedEnd);
                    if (isNaN(d.getTime())) return "";
                    const pad = (n: number) => String(n).padStart(2, "0");
                    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                  })()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setMaintenanceExpectedEnd("");
                      return;
                    }
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) {
                      setMaintenanceExpectedEnd(d.toISOString());
                    }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60 font-mono"
                />
                {maintenanceExpectedEnd && (
                  <button
                    type="button"
                    disabled={!canManageSettings || isPending}
                    onClick={() => setMaintenanceExpectedEnd("")}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer border border-red-200 shrink-0"
                  >
                    ล้างเวลา
                  </button>
                )}
              </div>
            </div>

            {/* ปุ่มตั้งเวลาด่วน (Quick Presets) */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] text-[#8C5D23] font-medium mr-1">ตั้งเวลาด่วน:</span>
              {[
                { label: "+15 นาที", minutes: 15 },
                { label: "+30 นาที", minutes: 30 },
                { label: "+1 ชม.", minutes: 60 },
                { label: "+2 ชม.", minutes: 120 },
                { label: "+4 ชม.", minutes: 240 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={!canManageSettings || isPending}
                  onClick={() => {
                    const target = new Date(Date.now() + preset.minutes * 60 * 1000);
                    target.setSeconds(0, 0);
                    setMaintenanceExpectedEnd(target.toISOString());
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#D9CABB] text-[#5A4D41] hover:bg-[#FAF0E1] hover:border-[#D9A441] hover:text-[#8C5D23] transition-all font-medium active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* พรีวิวตัวนับถอยหลังสด */}
            {maintenanceExpectedEnd && (
              <div className="mt-3 p-3.5 bg-white rounded-2xl border border-amber-200/80 shadow-2xs max-w-lg">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                  ตัวอย่างการแสดงเวลานับถอยหลังให้นักเรียน:
                </span>
                <MaintenanceCountdown targetTime={maintenanceExpectedEnd} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Global System Settings */}
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs p-6 sm:p-7 space-y-5">
        <div className="border-b border-[#F2E8DC] pb-4">
          <h3 className="font-bold text-base text-[#3F342B] flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#8C5D23]" />
            การตั้งค่าระบบทั่วไป & ภาคเรียน (General Configurations)
          </h3>
          <p className="text-xs text-[#7A6A5C]">
            กำหนดค่าส่วนกลางของชุมนุมโดยไม่ต้อง Hard-code ในระบบ
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Site Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5A4D41]">
              ชื่อระบบ / ชื่อชุมนุม
            </label>
            <input
              type="text"
              required
              disabled={!canManageSettings || isPending}
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="3S Party - ชุมนุมสื่อสร้างสรรค์"
              className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60"
            />
          </div>

          {/* Academic Term */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#C96B4B]" />
              <span>ภาคเรียนปัจจุบัน (ใช้เป็นค่าเริ่มต้นในระบบเช็กชื่อ)</span>
            </label>
            <input
              type="text"
              required
              disabled={!canManageSettings || isPending}
              value={academicTerm}
              onChange={(e) => setAcademicTerm(e.target.value)}
              placeholder="เช่น 1/2569 หรือ 2/2569"
              className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60"
            />
          </div>

          {/* Max Upload Size */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-600" />
              <span>ขนาดไฟล์ส่งงานสูงสุดที่อนุญาต (Megabytes)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={200}
                required
                disabled={!canManageSettings || isPending}
                value={maxUploadSizeMb}
                onChange={(e) => setMaxUploadSizeMb(parseInt(e.target.value, 10) || 50)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60 pr-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7A6A5C]">
                MB
              </span>
            </div>
            <p className="text-[11px] text-[#A8988B]">
              * ค่าเริ่มต้นมาตรฐานคือ 50MB (สูงสุดไม่เกิน 200MB)
            </p>
          </div>

          {/* Allow Student Name Edit */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-[#5A4D41] block">
              สิทธิ์การแก้ไขข้อมูลส่วนตัวของนักเรียน
            </label>
            <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] cursor-pointer hover:border-[#D9A441] transition-all">
              <input
                type="checkbox"
                disabled={!canManageSettings || isPending}
                checked={allowStudentNameEdit}
                onChange={(e) => setAllowStudentNameEdit(e.target.checked)}
                className="w-4 h-4 rounded text-[#D9A441] focus:ring-[#D9A441] rounded-md"
              />
              <div className="text-xs">
                <span className="font-bold text-[#3F342B] block">
                  อนุญาตให้นักเรียนแก้ไขชื่อ-นามสกุลตนเองได้
                </span>
                <span className="text-[11px] text-[#7A6A5C]">
                  หากปิด นักเรียนจะไม่สามารถเปลี่ยนชื่อจริงและนามสกุลในหน้าโปรไฟล์ได้
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Button */}
        {canManageSettings ? (
          <div className="flex justify-end pt-3 border-t border-[#F2E8DC]">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#8C5D23] hover:bg-[#724a1a] active:scale-95 disabled:opacity-50 transition-all shadow-md cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกการตั้งค่า...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกการตั้งค่าระบบ</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              คุณไม่มีสิทธิ์ในการแก้ไขการตั้งค่าระบบ (จำเป็นต้องมีสิทธิ์ MANAGE_SETTINGS หรือเป็น Super Admin)
            </span>
          </div>
        )}
      </div>
    </form>
  );
}
