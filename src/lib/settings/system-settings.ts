import { prisma } from "@/lib/prisma/client";

export interface SystemSettingsMap {
  maintenance_mode: boolean;
  maintenance_message: string;
  maintenance_expected_end: string;
  maintenance_auto_deactivate: boolean;
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
  maintenance_auto_deactivate: true,
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
    let rows: any[] = [];
    try {
      rows = await prisma.systemSetting.findMany();
    } catch (dbErr: any) {
      // Self-Healing: ถ้าตาราง system_settings ยังไม่มีใน Database ของ Deploy จริง ให้สร้างอัตโนมัติทันที
      if (dbErr?.code === "P2021" || dbErr?.message?.includes("does not exist")) {
        console.warn("[Settings] Table system_settings not found, auto-creating schema...");
        await prisma.$executeRawUnsafe(`
          ALTER TYPE "AdminPermission" ADD VALUE IF NOT EXISTS 'MANAGE_SETTINGS';
        `).catch(() => {});

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "system_settings" (
            "key" TEXT NOT NULL,
            "value" TEXT NOT NULL,
            "description" TEXT,
            "category" TEXT NOT NULL DEFAULT 'GENERAL',
            "updatedBy" TEXT,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "system_settings_category_idx" ON "system_settings"("category");
        `).catch(() => {});

        rows = await prisma.systemSetting.findMany().catch(() => []);
      } else {
        throw dbErr;
      }
    }

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
      maintenance_auto_deactivate:
        map["maintenance_auto_deactivate"] !== undefined
          ? map["maintenance_auto_deactivate"] === "true"
          : DEFAULT_SETTINGS.maintenance_auto_deactivate,
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

    // Auto-deactivate check: หากเปิด maintenance_auto_deactivate และเลยเวลา expected_end ให้ปลดล็อกระบบอัตโนมัติ
    if (
      result.maintenance_mode &&
      result.maintenance_auto_deactivate &&
      result.maintenance_expected_end
    ) {
      const endTime = new Date(result.maintenance_expected_end).getTime();
      if (!isNaN(endTime) && endTime <= now) {
        console.log("[Settings] Maintenance expected time passed, auto-deactivating maintenance mode...");
        result.maintenance_mode = false;
        prisma.systemSetting
          .upsert({
            where: { key: "maintenance_mode" },
            update: { value: "false", updatedBy: "SYSTEM_AUTO_TIMER" },
            create: { key: "maintenance_mode", value: "false", updatedBy: "SYSTEM_AUTO_TIMER" },
          })
          .catch((err) => console.warn("[Settings] Failed to auto-deactivate in DB:", err));
      }
    }

    cache = { data: result, timestamp: now };
    return result;
  } catch (error) {
    console.warn("[Settings] Notice: Using fallback settings (DB not ready or connecting):", error);
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
