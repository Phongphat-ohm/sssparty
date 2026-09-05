import { prisma } from "@/lib/prisma/client";

export interface SystemSettingsMap {
  maintenance_mode: boolean;
  maintenance_message: string;
  maintenance_expected_end: string;
  site_name: string;
  academic_term: string;
  max_upload_size_mb: number;
  allow_student_name_edit: boolean;
}

export const DEFAULT_SETTINGS: SystemSettingsMap = {
  maintenance_mode: false,
  maintenance_message:
    "ระบบกำลังปิดปรับปรุงชั่วคราว เพื่อพัฒนาระบบให้ดียิ่งขึ้น ขออภัยในความไม่สะดวกครับ",
  maintenance_expected_end: "",
  site_name: "3S Party - ชุมนุมสื่อสร้างสรรค์",
  academic_term: "1/2569",
  max_upload_size_mb: 50,
  allow_student_name_edit: true,
};

// In-memory Cache เพื่อความรวดเร็วระดับ milliseconds
let cache: { data: SystemSettingsMap; timestamp: number } | null = null;
const CACHE_TTL_MS = 10000; // 10 วินาที

/**
 * ดึงค่าการตั้งค่าทั้งหมดของระบบ (พร้อมระบบ Cache และ Fallback)
 */
export async function getSystemSettings(): Promise<SystemSettingsMap> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const rows = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }

    const result: SystemSettingsMap = {
      maintenance_mode:
        map["maintenance_mode"] !== undefined
          ? map["maintenance_mode"] === "true"
          : DEFAULT_SETTINGS.maintenance_mode,
      maintenance_message:
        map["maintenance_message"] || DEFAULT_SETTINGS.maintenance_message,
      maintenance_expected_end:
        map["maintenance_expected_end"] || DEFAULT_SETTINGS.maintenance_expected_end,
      site_name: map["site_name"] || DEFAULT_SETTINGS.site_name,
      academic_term: map["academic_term"] || DEFAULT_SETTINGS.academic_term,
      max_upload_size_mb: map["max_upload_size_mb"]
        ? parseInt(map["max_upload_size_mb"], 10) || DEFAULT_SETTINGS.max_upload_size_mb
        : DEFAULT_SETTINGS.max_upload_size_mb,
      allow_student_name_edit:
        map["allow_student_name_edit"] !== undefined
          ? map["allow_student_name_edit"] === "true"
          : DEFAULT_SETTINGS.allow_student_name_edit,
    };

    cache = { data: result, timestamp: now };
    return result;
  } catch (error) {
    console.error("[Settings] Failed to fetch settings from DB, using defaults:", error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * ดึงค่าการตั้งค่าเฉพาะคีย์ที่ต้องการ
 */
export async function getSystemSetting<K extends keyof SystemSettingsMap>(
  key: K
): Promise<SystemSettingsMap[K]> {
  const settings = await getSystemSettings();
  return settings[key];
}

/**
 * ล้าง In-memory Cache ทันทีเมื่อมีการอัปเดตการตั้งค่า
 */
export function invalidateSettingsCache(): void {
  cache = null;
}
