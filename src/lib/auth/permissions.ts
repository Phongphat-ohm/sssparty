export type AdminRoleType = "SUPER_ADMIN" | "TEACHER" | "ASSISTANT" | "CUSTOM";

export type AdminPermissionType =
  | "MANAGE_ASSIGNMENTS"
  | "GRADE_SUBMISSIONS"
  | "MANAGE_ATTENDANCE"
  | "MANAGE_STUDENTS"
  | "MANAGE_USERS"
  | "VIEW_AUDIT_LOGS"
  | "MANAGE_SETTINGS"
  | "VIEW_REPORTS";

export interface PermissionDefinition {
  key: AdminPermissionType;
  label: string;
  description: string;
  category: string;
}

export const ADMIN_PERMISSIONS_LIST: PermissionDefinition[] = [
  {
    key: "MANAGE_ASSIGNMENTS",
    label: "จัดการการบ้าน",
    description: "สร้าง แก้ไข ปิดรับงาน หรือลบการบ้านในระบบ",
    category: "วิชาการ & กิจกรรม",
  },
  {
    key: "GRADE_SUBMISSIONS",
    label: "ตรวจงาน & ให้คะแนน",
    description: "ตรวจงานของนักเรียน ให้คะแนน และเขียนข้อเสนอแนะ",
    category: "วิชาการ & กิจกรรม",
  },
  {
    key: "MANAGE_ATTENDANCE",
    label: "เช็กชื่อกิจกรรม",
    description: "สร้างคาบกิจกรรม เช็กชื่อ และแก้ไขประวัติการมาเรียน",
    category: "วิชาการ & กิจกรรม",
  },
  {
    key: "MANAGE_STUDENTS",
    label: "จัดการข้อมูลนักเรียน",
    description: "เพิ่ม แก้ไข ลบ และนำเข้าข้อมูลนักเรียนผ่านไฟล์ CSV",
    category: "ข้อมูลสมาชิก",
  },
  {
    key: "VIEW_REPORTS",
    label: "ดูประวัติรายงาน (Report History)",
    description: "เข้าดูประวัติ ดาวน์โหลดเอกสารรายงาน และตรวจสอบรหัสเอกสารที่เคยสร้าง",
    category: "วิชาการ & กิจกรรม",
  },
  {
    key: "MANAGE_USERS",
    label: "จัดการผู้ดูแล & สิทธิ์ระบบ",
    description: "เพิ่ม/แก้ไขบัญชีครู กำหนดสิทธิ์ และรีเซ็ตรหัสผ่าน",
    category: "ความปลอดภัย & ระบบ",
  },
  {
    key: "VIEW_AUDIT_LOGS",
    label: "ดูบันทึกประวัติ (Audit Logs)",
    description: "เข้าดูประวัติการเข้าใช้งานและเหตุการณ์ทั้งหมดในระบบ",
    category: "ความปลอดภัย & ระบบ",
  },
  {
    key: "MANAGE_SETTINGS",
    label: "ตั้งค่าระบบ & ปรับปรุง (Settings)",
    description: "เปิด/ปิดโหมดปรับปรุงระบบ (Maintenance) และแก้ไขการตั้งค่ากลาง",
    category: "ความปลอดภัย & ระบบ",
  },
];

export const ALL_ADMIN_PERMISSIONS: AdminPermissionType[] = ADMIN_PERMISSIONS_LIST.map(
  (p) => p.key
);

export const ROLE_DEFAULT_PERMISSIONS: Record<AdminRoleType, AdminPermissionType[]> = {
  SUPER_ADMIN: [
    "MANAGE_ASSIGNMENTS",
    "GRADE_SUBMISSIONS",
    "MANAGE_ATTENDANCE",
    "MANAGE_STUDENTS",
    "VIEW_REPORTS",
    "MANAGE_USERS",
    "VIEW_AUDIT_LOGS",
    "MANAGE_SETTINGS",
  ],
  TEACHER: [
    "MANAGE_ASSIGNMENTS",
    "GRADE_SUBMISSIONS",
    "MANAGE_ATTENDANCE",
    "MANAGE_STUDENTS",
    "VIEW_REPORTS",
  ],
  ASSISTANT: [
    "GRADE_SUBMISSIONS",
    "MANAGE_ATTENDANCE",
  ],
  CUSTOM: [],
};

export const ROLE_LABELS: Record<AdminRoleType, { label: string; badgeColor: string; description: string }> = {
  SUPER_ADMIN: {
    label: "ผู้ดูแลระบบสูงสุด (Super Admin)",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    description: "มีสิทธิ์เต็มรูปแบบทุกระบบ สามารถจัดการผู้ใช้และดู Audit Logs ได้",
  },
  TEACHER: {
    label: "อาจารย์ผู้สอน (Teacher)",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    description: "จัดการการบ้าน ตรวจงาน เช็กชื่อ และจัดการนักเรียนได้",
  },
  ASSISTANT: {
    label: "ผู้ช่วยสอน / กรรมการ (Assistant)",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    description: "ช่วยตรวจงานและเช็กชื่อกิจกรรมได้",
  },
  CUSTOM: {
    label: "กำหนดสิทธิ์เฉพาะ (Custom)",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    description: "กำหนดสิทธิ์การเข้าถึงแต่ละโมดูลอย่างอิสระ",
  },
};

/**
 * ตรวจสอบว่าผู้ใช้มีสิทธิ์ตามที่กำหนดหรือไม่ (Client & Server safe)
 */
export function hasAdminPermission(
  user: {
    role: string;
    adminRole?: string | null;
    permissions?: string[] | null;
  } | null | undefined,
  requiredPermission: AdminPermissionType
): boolean {
  if (!user || user.role !== "ADMIN") return false;

  // SUPER_ADMIN มีสิทธิ์ทุกอย่างโดยอัตโนมัติ
  if (user.adminRole === "SUPER_ADMIN") return true;

  // ตรวจสอบในรายการ permissions ที่ระบุไว้ในบัญชี
  if (user.permissions && user.permissions.includes(requiredPermission)) {
    return true;
  }

  // หากเป็น Role มาตรฐาน และไม่ได้ระบุ Custom ให้ดึงตามค่า Default ของ Role นั้น
  if (user.adminRole && user.adminRole in ROLE_DEFAULT_PERMISSIONS) {
    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[user.adminRole as AdminRoleType];
    return defaultPerms.includes(requiredPermission);
  }

  return false;
}
