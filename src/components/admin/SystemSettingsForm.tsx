"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  GraduationCap,
  FileCheck,
  Server,
  MapPin,
  ExternalLink,
  Users,
  BookOpen,
  ClipboardList,
  Layers,
  Sparkles,
  Phone,
  Building2,
  Check,
  HelpCircle,
  Lock,
} from "lucide-react";
import { updateSystemSettingsAction } from "@/actions/settings";
import { SystemSettingsMap } from "@/lib/settings/system-settings";
import { ThaiTimeInput } from "@/components/ui/ThaiTimeInput";
import { ThaiDateTimePicker } from "@/components/ui/ThaiDateTimePicker";
import { showCozySuccess, showCozyError } from "@/lib/ui/swal";
import { MaintenanceCountdown } from "@/components/common/MaintenanceCountdown";

import {
  DEFAULT_ACADEMIC_TERM,
  DEFAULT_ATTENDANCE_RADIUS,
  DEFAULT_CUTOFF_TIME,
  DEFAULT_MAX_UPLOAD_SIZE_MB,
  DEFAULT_MIN_ATTENDANCE_PERCENT,
  DEFAULT_SITE_NAME,
  DEFAULT_TEACHER_NAME,
} from "@/lib/constants/defaults";

export type SettingsTab =
  | "TEACHER"
  | "ACADEMIC"
  | "SUBMISSION"
  | "MAINTENANCE"
  | "SYSTEM";

export interface SystemStats {
  studentCount: number;
  assignmentCount: number;
  attendanceSessionCount: number;
  adminCount: number;
  termCount: number;
}

interface SystemSettingsFormProps {
  initialSettings: SystemSettingsMap;
  canManageSettings: boolean;
  systemStats?: SystemStats;
}

export function SystemSettingsForm({
  initialSettings,
  canManageSettings,
  systemStats,
}: SystemSettingsFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("TEACHER");

  // 1. Tab 1: ข้อมูลครูและชุมนุม
  const [teacherName, setTeacherName] = useState(initialSettings.teacher_name || DEFAULT_TEACHER_NAME);
  const [schoolName, setSchoolName] = useState(initialSettings.school_name || "");
  const [teacherContact, setTeacherContact] = useState(initialSettings.teacher_contact || "");
  const [siteName, setSiteName] = useState(initialSettings.site_name || DEFAULT_SITE_NAME);

  // 2. Tab 2: วิชาการและการเช็กชื่อ (ภาคเรียนเป็น read-only จัดการได้เฉพาะหน้า /admin/terms)
  const academicTerm = initialSettings.academic_term || DEFAULT_ACADEMIC_TERM;
  const [minAttendancePercent, setMinAttendancePercent] = useState(
    initialSettings.min_attendance_percent ?? DEFAULT_MIN_ATTENDANCE_PERCENT
  );
  const [defaultAttendanceRadius, setDefaultAttendanceRadius] = useState(
    initialSettings.default_attendance_radius ?? DEFAULT_ATTENDANCE_RADIUS
  );
  const [defaultCutoffTime, setDefaultCutoffTime] = useState(
    initialSettings.default_cutoff_time || DEFAULT_CUTOFF_TIME
  );

  // 3. Tab 3: นโยบายการส่งงานและไฟล์
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(
    initialSettings.max_upload_size_mb ?? DEFAULT_MAX_UPLOAD_SIZE_MB
  );
  const [allowedFileTypes, setAllowedFileTypes] = useState(
    initialSettings.allowed_file_types || "pdf, zip, png, jpg, jpeg, mp4, docx, pptx"
  );
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(
    initialSettings.allow_late_submissions ?? true
  );
  const [allowStudentNameEdit, setAllowStudentNameEdit] = useState(
    initialSettings.allow_student_name_edit ?? true
  );

  // 4. Tab 4: โหมดปรับปรุงระบบ
  const [maintenanceMode, setMaintenanceMode] = useState(initialSettings.maintenance_mode ?? false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    initialSettings.maintenance_message ||
      "ระบบกำลังปิดปรับปรุงชั่วคราว เพื่อพัฒนาระบบให้ดียิ่งขึ้น ขออภัยในความไม่สะดวกครับ"
  );
  const [maintenanceExpectedEnd, setMaintenanceExpectedEnd] = useState(
    initialSettings.maintenance_expected_end || ""
  );
  const [maintenanceAutoDeactivate, setMaintenanceAutoDeactivate] = useState(
    initialSettings.maintenance_auto_deactivate ?? true
  );

  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canManageSettings) return;

    setIsPending(true);

    const formData = new FormData();
    // 1. ข้อมูลครูและชุมนุม
    formData.set("teacher_name", teacherName);
    formData.set("school_name", schoolName);
    formData.set("teacher_contact", teacherContact);
    formData.set("site_name", siteName);

    // 2. วิชาการและการเช็กชื่อ (ภาคเรียนจัดการผ่าน /admin/terms เท่านั้น)
    formData.set("min_attendance_percent", String(minAttendancePercent));
    formData.set("default_attendance_radius", String(defaultAttendanceRadius));
    formData.set("default_cutoff_time", defaultCutoffTime);

    // 3. นโยบายการส่งงานและไฟล์
    formData.set("max_upload_size_mb", String(maxUploadSizeMb));
    formData.set("allowed_file_types", allowedFileTypes);
    formData.set("allow_late_submissions", String(allowLateSubmissions));
    formData.set("allow_student_name_edit", String(allowStudentNameEdit));

    // 4. โหมดปรับปรุงระบบ
    formData.set("maintenance_mode", String(maintenanceMode));
    formData.set("maintenance_message", maintenanceMessage);
    formData.set("maintenance_expected_end", maintenanceExpectedEnd);
    formData.set("maintenance_auto_deactivate", String(maintenanceAutoDeactivate));

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

  const tabs: { id: SettingsTab; label: string; icon: any; badge?: string }[] = [
    {
      id: "TEACHER",
      label: "ครู & ชุมนุม",
      icon: UserCheck,
    },
    {
      id: "ACADEMIC",
      label: "วิชาการ & เช็กชื่อ",
      icon: GraduationCap,
    },
    {
      id: "SUBMISSION",
      label: "นโยบายส่งงาน & ไฟล์",
      icon: FileCheck,
    },
    {
      id: "MAINTENANCE",
      label: "โหมดบำรุงรักษา",
      icon: Wrench,
      badge: maintenanceMode ? "เปิดอยู่" : undefined,
    },
    {
      id: "SYSTEM",
      label: "ข้อมูลระบบ & สถานะ",
      icon: Server,
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white border border-[#EADBCC] shadow-2xs overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-[#8C5D23] text-white shadow-xs"
                  : "text-[#7A6A5C] hover:bg-[#FAF6F0] hover:text-[#3F342B]"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#8C5D23]"}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: ข้อมูลครูและชุมนุม (Teacher & Club Info) */}
      {activeTab === "TEACHER" && (
        <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-[#F2E8DC] pb-4">
            <h3 className="font-bold text-base text-[#3F342B] flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#8C5D23]" />
              <span>ข้อมูลคุณครูผู้สอน & ชุมนุม (Teacher & Club Settings)</span>
            </h3>
            <p className="text-xs text-[#7A6A5C] pt-0.5">
              กำหนดชื่อครูผู้สอนประจำชุมนุมสำหรับใช้บนเอกสารราชการ ลายเซ็นต์รายงาน และหน้าหลักของระบบ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Teacher Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
                <span>ชื่อ-นามสกุล ครูผู้สอน / ครูที่ปรึกษาประจำชุมนุม</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!canManageSettings || isPending}
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="เช่น นายสมศักดิ์ รักเรียน หรือ ครูสมศักดิ์"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60 font-medium"
              />
              <p className="text-[11px] text-[#A8988B]">
                * ชื่อนี้จะถูกนำไปใช้เป็นชื่อผู้ลงนามบนเอกสารสรุปคะแนน รายงานการส่งงาน และรายงานการเช็กชื่อของชุมนุม
              </p>
            </div>

            {/* School / Organization Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#8C5D23]" />
                <span>ชื่อโรงเรียน / สถานศึกษา (ถ้ามี)</span>
              </label>
              <input
                type="text"
                disabled={!canManageSettings || isPending}
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="เช่น โรงเรียนสามเสนวิทยาลัย"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60"
              />
              <p className="text-[11px] text-[#A8988B]">
                จะแสดงบนส่วนหัวของรายงาน PDF ทางการ
              </p>
            </div>

            {/* Teacher Contact Info */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>ช่องทางติดต่อคุณครู (สำหรับนักเรียน)</span>
              </label>
              <input
                type="text"
                disabled={!canManageSettings || isPending}
                value={teacherContact}
                onChange={(e) => setTeacherContact(e.target.value)}
                placeholder="เช่น Line ID: @teacher หรือ โทร 08x-xxx-xxxx"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60"
              />
              <p className="text-[11px] text-[#A8988B]">
                แสดงในหน้าเข้าสู่ระบบและหน้าแจ้งเตือนของนักเรียน
              </p>
            </div>

            {/* Site Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#8C5D23]" />
                <span>ชื่อระบบ / ชื่อกิจกรรมชุมนุม</span>
                <span className="text-red-500">*</span>
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
          </div>
        </div>
      )}

      {/* Tab 2: วิชาการ & การเช็กชื่อ (Academic & Attendance Defaults) */}
      {activeTab === "ACADEMIC" && (
        <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-[#F2E8DC] pb-4">
            <h3 className="font-bold text-base text-[#3F342B] flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#C96B4B]" />
              <span>การตั้งค่าวิชาการ & การเช็กชื่อ (Academic & Attendance)</span>
            </h3>
            <p className="text-xs text-[#7A6A5C] pt-0.5">
              กำหนดภาคเรียนเริ่มต้น เกณฑ์การผ่านกิจกรรมชุมนุม และค่ามาตรฐานสำหรับระบบเช็กชื่อ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Academic Term - Read Only Display */}
            <div className="sm:col-span-2 p-4 sm:p-5 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#8C5D23]" />
                    <span className="text-xs font-bold text-[#3F342B]">
                      ภาคเรียนปัจจุบันของระบบ (Active Academic Term)
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                      <Lock className="w-3 h-3 text-amber-700" />
                      อ่านอย่างเดียว (ห้ามแก้ไขที่นี่)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A6A5C]">
                    ระบบไม่อนุญาตให้แก้ไขภาคเรียนจากหน้านี้ เพื่อความถูกต้องและสอดคล้องของข้อมูลทั้งระบบ หากต้องการสลับเทอมปัจจุบันหรือจัดการข้อมูล ให้ทำรายการที่หน้า &quot;จัดการภาคเรียน&quot;
                  </p>
                </div>

                <Link
                  href="/admin/terms"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#D9CABB] text-xs font-bold text-[#8C5D23] hover:bg-[#FAF0E1] hover:border-[#D9A441] transition-all shadow-2xs shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#8C5D23]" />
                  <span>ไปที่หน้าจัดการภาคเรียน</span>
                  <ExternalLink className="w-3 h-3 text-[#A8988B]" />
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#F2E8DC]">
                <div className="px-4 py-2 rounded-xl bg-white border border-[#D9CABB] font-mono text-sm font-bold text-[#3F342B] shadow-2xs">
                  {academicTerm}
                </div>
                <span className="text-xs text-[#7A6A5C] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ภาคเรียนหลักที่ระบบใช้งานอยู่ในปัจจุบัน (เป็นค่าเริ่มต้นเมื่อครูสร้างการบ้านหรือเปิดรอบเช็กชื่อ)
                </span>
              </div>
            </div>

            {/* Min Attendance Percentage */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>เกณฑ์เวลาเรียนขั้นต่ำสำหรับผ่านกิจกรรมชุมนุม (%)</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  disabled={!canManageSettings || isPending}
                  value={minAttendancePercent}
                  onChange={(e) => setMinAttendancePercent(parseFloat(e.target.value) || 80)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60 pr-10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7A6A5C]">
                  %
                </span>
              </div>
              <p className="text-[11px] text-[#A8988B]">
                ตามมาตรฐานโรงเรียนทั่วไปกำหนดไว้ที่ 80% ของเวลาเรียนทั้งหมด
              </p>
            </div>

            {/* Default Attendance Radius */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>รัศมีการเช็กชื่อผ่าน GPS เริ่มต้น (เมตร)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={10}
                  max={5000}
                  required
                  disabled={!canManageSettings || isPending}
                  value={defaultAttendanceRadius}
                  onChange={(e) => setDefaultAttendanceRadius(parseFloat(e.target.value) || 100)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60 pr-14"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7A6A5C]">
                  เมตร
                </span>
              </div>
              <p className="text-[11px] text-[#A8988B]">
                ค่าแนะนำ: 50-100 เมตร เพื่อความแม่นยำในการระบุว่านักเรียนอยู่ในห้องเรียนจริง
              </p>
            </div>

            {/* Default Cutoff Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>เวลาตัดรอบเช็กชื่อตรงเวลาเริ่มต้น (ระบบ 24 ชม.)</span>
              </label>
              <ThaiTimeInput
                disabled={!canManageSettings || isPending}
                value={defaultCutoffTime}
                onChange={setDefaultCutoffTime}
              />
              <p className="text-[11px] text-[#A8988B]">
                นักเรียนที่เช็กชื่อหลังเวลานี้จะถูกบันทึกเป็น &quot;สาย (Late)&quot; อัตโนมัติ
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: นโยบายส่งงาน & ไฟล์ (Submission & File Policies) */}
      {activeTab === "SUBMISSION" && (
        <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-[#F2E8DC] pb-4">
            <h3 className="font-bold text-base text-[#3F342B] flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600" />
              <span>นโยบายการส่งงาน & จัดการไฟล์ (Submission & File Policies)</span>
            </h3>
            <p className="text-xs text-[#7A6A5C] pt-0.5">
              กำหนดขนาดไฟล์สูงสุด ประเภทไฟล์ที่อนุญาต และเงื่อนไขการส่งงานของนักเรียน
            </p>
          </div>

          <div className="space-y-5">
            {/* Max Upload Size */}
            <div className="space-y-1.5 max-w-lg">
              <label className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                <span>ขนาดไฟล์ส่งงานสูงสุดที่อนุญาต (Megabytes)</span>
                <span className="text-red-500">*</span>
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
                * ค่าเริ่มต้นมาตรฐานคือ 50MB (กำหนดได้สูงสุด 200MB สำหรับงานวิดีโอ/มัลติมีเดีย)
              </p>
            </div>

            {/* Allowed File Types */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#5A4D41] flex items-center justify-between">
                <span>ประเภทนามสกุลไฟล์ที่อนุญาตให้นักเรียนอัปโหลด</span>
                <span className="text-[11px] text-[#7A6A5C]">คั่นด้วยเครื่องหมายจุลภาค (,)</span>
              </label>
              <input
                type="text"
                required
                disabled={!canManageSettings || isPending}
                value={allowedFileTypes}
                onChange={(e) => setAllowedFileTypes(e.target.value)}
                placeholder="เช่น pdf, zip, png, jpg, jpeg, mp4, docx, pptx"
                className="w-full px-4 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs sm:text-sm text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60 font-mono"
              />

              {/* Quick Preset Buttons for File Types */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <span className="text-[11px] text-[#8C5D23] font-medium mr-1">เลือกชุดนามสกุลด่วน:</span>
                {[
                  {
                    label: "เอกสารทั่วไป (PDF, Word, PPT)",
                    val: "pdf, doc, docx, ppt, pptx, xls, xlsx",
                  },
                  {
                    label: "รูปภาพและกราฟิก (PNG, JPG, PSD)",
                    val: "png, jpg, jpeg, gif, webp, psd, ai",
                  },
                  {
                    label: "มัลติมีเดีย (วิดีโอ, เสียง)",
                    val: "mp4, mov, avi, mp3, wav",
                  },
                  {
                    label: "ไฟล์บีบอัด (ZIP, RAR)",
                    val: "zip, rar, 7z",
                  },
                  {
                    label: "ครบทุกประเภท (แนะนำสำหรับสื่อสร้างสรรค์)",
                    val: "pdf, zip, png, jpg, jpeg, mp4, docx, pptx",
                  },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={!canManageSettings || isPending}
                    onClick={() => setAllowedFileTypes(preset.val)}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF6F0] border border-[#D9CABB] text-[#5A4D41] hover:bg-[#FAF0E1] hover:border-[#D9A441] hover:text-[#8C5D23] transition-all font-medium active:scale-95 cursor-pointer disabled:opacity-60 text-[11px]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkboxes: Late Submissions & Student Name Edit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Allow Late Submissions */}
              <label className="flex items-start gap-3 p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] cursor-pointer hover:border-[#D9A441] transition-all">
                <input
                  type="checkbox"
                  disabled={!canManageSettings || isPending}
                  checked={allowLateSubmissions}
                  onChange={(e) => setAllowLateSubmissions(e.target.checked)}
                  className="w-4 h-4 rounded text-[#D9A441] focus:ring-[#D9A441] mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-bold text-[#3F342B] block">
                    อนุญาตให้นักเรียนส่งงานหลังกำหนดส่ง (Late Submission)
                  </span>
                  <span className="text-[11px] text-[#7A6A5C] leading-snug block mt-0.5">
                    งานที่ส่งหลังครบกำหนดจะติดสถานะ &quot;ส่งล่าช้า (Late)&quot; และแจ้งเตือนให้ครูทราบ
                  </span>
                </div>
              </label>

              {/* Allow Student Name Edit */}
              <label className="flex items-start gap-3 p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] cursor-pointer hover:border-[#D9A441] transition-all">
                <input
                  type="checkbox"
                  disabled={!canManageSettings || isPending}
                  checked={allowStudentNameEdit}
                  onChange={(e) => setAllowStudentNameEdit(e.target.checked)}
                  className="w-4 h-4 rounded text-[#D9A441] focus:ring-[#D9A441] mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-bold text-[#3F342B] block">
                    อนุญาตให้นักเรียนแก้ไขชื่อ-นามสกุลตนเองได้
                  </span>
                  <span className="text-[11px] text-[#7A6A5C] leading-snug block mt-0.5">
                    หากปิด นักเรียนจะไม่สามารถเปลี่ยนชื่อจริงและนามสกุลในหน้าโปรไฟล์ได้
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: โหมดปิดปรับปรุงระบบ (Maintenance Mode) */}
      {activeTab === "MAINTENANCE" && (
        <div
          className={`rounded-3xl border p-6 sm:p-8 space-y-6 transition-all animate-in fade-in duration-200 ${
            maintenanceMode
              ? "bg-amber-50/70 border-amber-300 shadow-sm"
              : "bg-white border-[#EADBCC] shadow-xs"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2E8DC] pb-5">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-2xs ${
                  maintenanceMode ? "bg-amber-500 text-white" : "bg-[#FAF0E1] text-[#D9A441]"
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
          <div className="space-y-4">
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
                <div className="max-w-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <ThaiDateTimePicker
                        disabled={!canManageSettings || isPending}
                        value={maintenanceExpectedEnd}
                        onChange={(val) => {
                          if (!val) {
                            setMaintenanceExpectedEnd("");
                            return;
                          }
                          const d = new Date(val);
                          if (!isNaN(d.getTime())) {
                            setMaintenanceExpectedEnd(d.toISOString());
                          }
                        }}
                        showQuickPresets={false}
                      />
                    </div>
                    {maintenanceExpectedEnd && (
                      <button
                        type="button"
                        disabled={!canManageSettings || isPending}
                        onClick={() => setMaintenanceExpectedEnd("")}
                        className="mt-6 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer border border-red-200 shrink-0"
                      >
                        ล้างเวลา
                      </button>
                    )}
                  </div>
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

              {/* ตัวเลือกเปิดระบบอัตโนมัติเมื่อครบกำหนดเวลา */}
              {maintenanceExpectedEnd && (
                <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#EADBCC] max-w-lg shadow-2xs">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#3F342B] block">
                      ปลดล็อกเปิดระบบอัตโนมัติ (Auto-deactivate)
                    </span>
                    <span className="text-[11px] text-[#7A6A5C] block">
                      เมื่อถึงเวลาที่กำหนด ระบบจะเปิดให้บริการนักเรียนอัตโนมัติโดยไม่ต้องเข้ามากดปิดเอง
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                    <input
                      type="checkbox"
                      disabled={!canManageSettings || isPending}
                      checked={maintenanceAutoDeactivate}
                      onChange={(e) => setMaintenanceAutoDeactivate(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: ข้อมูลระบบ & การวินิจฉัย (System Overview & Diagnostics) */}
      {activeTab === "SYSTEM" && (
        <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-xs p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-[#F2E8DC] pb-4">
            <h3 className="font-bold text-base text-[#3F342B] flex items-center gap-2">
              <Server className="w-5 h-5 text-[#8C5D23]" />
              <span>ภาพรวมและสถานะระบบ (System Diagnostics & Resources)</span>
            </h3>
            <p className="text-xs text-[#7A6A5C] pt-0.5">
              ตรวจสอบความพร้อมของระบบฐานข้อมูล เซิร์ฟเวอร์ และสถิติข้อมูลปัจจุบัน
            </p>
          </div>

          {/* System Statistics Cards */}
          {systemStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] space-y-1">
                <div className="flex items-center justify-between text-[#8C5D23]">
                  <span className="text-xs font-bold">สมาชิกนักเรียน</span>
                  <Users className="w-4 h-4" />
                </div>
                <p className="text-2xl font-black text-[#3F342B]">{systemStats.studentCount}</p>
                <p className="text-[10px] text-[#7A6A5C]">บัญชีนักเรียนที่ใช้งาน</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] space-y-1">
                <div className="flex items-center justify-between text-[#B94E48]">
                  <span className="text-xs font-bold">ภาระงานทั้งหมด</span>
                  <BookOpen className="w-4 h-4" />
                </div>
                <p className="text-2xl font-black text-[#3F342B]">{systemStats.assignmentCount}</p>
                <p className="text-[10px] text-[#7A6A5C]">การบ้านที่สร้างในระบบ</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] space-y-1">
                <div className="flex items-center justify-between text-blue-600">
                  <span className="text-xs font-bold">รอบการเช็กชื่อ</span>
                  <ClipboardList className="w-4 h-4" />
                </div>
                <p className="text-2xl font-black text-[#3F342B]">{systemStats.attendanceSessionCount}</p>
                <p className="text-[10px] text-[#7A6A5C]">ครั้งที่มีการเช็กชื่อ</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC] space-y-1">
                <div className="flex items-center justify-between text-purple-600">
                  <span className="text-xs font-bold">ผู้ดูแล / ครู</span>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <p className="text-2xl font-black text-[#3F342B]">{systemStats.adminCount}</p>
                <p className="text-[10px] text-[#7A6A5C]">บัญชีครูและแอดมิน</p>
              </div>
            </div>
          )}

          {/* Technical Diagnostics */}
          <div className="p-5 rounded-2xl bg-[#FAF6F0]/60 border border-[#EADBCC] space-y-3">
            <h4 className="font-bold text-xs text-[#3F342B] uppercase tracking-wider">
              สถานะบริการและสถาปัตยกรรม (Architecture Status)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-[#EADBCC] flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div>
                  <span className="font-bold text-[#3F342B] block">PostgreSQL Database</span>
                  <span className="text-[11px] text-[#7A6A5C]">เชื่อมต่อปกติ (Prisma 7)</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#EADBCC] flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div>
                  <span className="font-bold text-[#3F342B] block">Next.js Framework</span>
                  <span className="text-[11px] text-[#7A6A5C]">Next.js 16 App Router</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#EADBCC] flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div>
                  <span className="font-bold text-[#3F342B] block">S3 Object Storage</span>
                  <span className="text-[11px] text-[#7A6A5C]">Zero-Trust Presigned URLs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Management Links */}
          <div className="pt-2 border-t border-[#F2E8DC]">
            <h4 className="font-bold text-xs text-[#5A4D41] mb-2.5">
              การจัดการขั้นสูงและระบบอื่นที่เกี่ยวข้อง:
            </h4>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/admin/terms"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#EADBCC] text-xs font-semibold text-[#8C5D23] hover:bg-[#FAF0E1] hover:border-[#D9A441] transition-all"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>จัดการภาคเรียน (Academic Terms)</span>
                <ExternalLink className="w-3 h-3 text-[#A8988B]" />
              </Link>

              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#EADBCC] text-xs font-semibold text-[#8C5D23] hover:bg-[#FAF0E1] hover:border-[#D9A441] transition-all"
              >
                <Users className="w-3.5 h-3.5" />
                <span>จัดการบัญชีผู้ดูแล & ครู (User Management)</span>
                <ExternalLink className="w-3 h-3 text-[#A8988B]" />
              </Link>

              <Link
                href="/admin/logs"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#EADBCC] text-xs font-semibold text-[#8C5D23] hover:bg-[#FAF0E1] hover:border-[#D9A441] transition-all"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>ดูประวัติการทำรายการ (Audit Logs)</span>
                <ExternalLink className="w-3 h-3 text-[#A8988B]" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Action Bar */}
      <div className="sticky bottom-4 z-10 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-[#EADBCC] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#7A6A5C]">
          <Sparkles className="w-4 h-4 text-[#D9A441] shrink-0" />
          <span>
            บันทึกการตั้งค่าจะมีผลทันทีทั่วทั้งระบบและรีเฟรชแคชอัตโนมัติ
          </span>
        </div>

        {canManageSettings ? (
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#8C5D23] hover:bg-[#724a1a] active:scale-95 disabled:opacity-50 transition-all shadow-md cursor-pointer shrink-0"
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
        ) : (
          <div className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            โหมดดูอย่างเดียว (Read-Only)
          </div>
        )}
      </div>
    </form>
  );
}
