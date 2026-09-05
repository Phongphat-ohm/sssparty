"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requireAdminPermission } from "@/lib/auth/permissions-server";
import { createAuditLog } from "@/lib/audit/logger";
import {
  getSystemSettings,
  invalidateSettingsCache,
  SystemSettingsMap,
} from "@/lib/settings/system-settings";

export interface SettingsActionResult {
  success: boolean;
  message?: string;
  settings?: SystemSettingsMap;
}

/**
 * Server Action ดึงการตั้งค่าระบบทั้งหมด
 */
export async function getSystemSettingsAction(): Promise<SettingsActionResult> {
  try {
    const settings = await getSystemSettings();
    return {
      success: true,
      settings,
    };
  } catch (error) {
    console.error("getSystemSettingsAction error:", error);
    return {
      success: false,
      message: "ไม่สามารถดึงข้อมูลการตั้งค่าระบบได้",
    };
  }
}

/**
 * Server Action บันทึกการตั้งค่าระบบส่วนกลาง
 */
export async function updateSystemSettingsAction(
  formData: FormData
): Promise<SettingsActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_SETTINGS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const maintenanceMode = formData.get("maintenance_mode") === "true";
    const maintenanceMessage =
      (formData.get("maintenance_message") as string)?.trim() ||
      "ระบบกำลังปิดปรับปรุงชั่วคราว เพื่อพัฒนาระบบให้ดียิ่งขึ้น ขออภัยในความไม่สะดวกครับ";
    const maintenanceExpectedEnd =
      (formData.get("maintenance_expected_end") as string)?.trim() || "";
    const siteName =
      (formData.get("site_name") as string)?.trim() || "3S Party - ชุมนุมสื่อสร้างสรรค์";
    const academicTerm =
      (formData.get("academic_term") as string)?.trim() || "1/2569";
    const maxUploadSizeMb = parseInt(
      (formData.get("max_upload_size_mb") as string) || "50",
      10
    );
    const allowStudentNameEdit =
      formData.get("allow_student_name_edit") === "true";

    const settingsToUpdate = [
      {
        key: "maintenance_mode",
        value: String(maintenanceMode),
        description: "เปิด/ปิดโหมดปรับปรุงระบบ (Maintenance Mode)",
        category: "MAINTENANCE",
      },
      {
        key: "maintenance_message",
        value: maintenanceMessage,
        description: "ข้อความแจ้งเตือนที่แสดงบนหน้าแจ้งปรับปรุงระบบ",
        category: "MAINTENANCE",
      },
      {
        key: "maintenance_expected_end",
        value: maintenanceExpectedEnd,
        description: "เวลาที่คาดว่าจะเปิดระบบตามปกติ",
        category: "MAINTENANCE",
      },
      {
        key: "site_name",
        value: siteName,
        description: "ชื่อระบบหรือชื่อชุมนุม",
        category: "GENERAL",
      },
      {
        key: "academic_term",
        value: academicTerm,
        description: "ภาคเรียนปัจจุบันสำหรับใช้เป็นค่าเริ่มต้นในระบบ",
        category: "ACADEMIC",
      },
      {
        key: "max_upload_size_mb",
        value: String(isNaN(maxUploadSizeMb) || maxUploadSizeMb <= 0 ? 50 : maxUploadSizeMb),
        description: "ขนาดไฟล์ส่งงานสูงสุดที่อนุญาต (MB)",
        category: "UPLOAD",
      },
      {
        key: "allow_student_name_edit",
        value: String(allowStudentNameEdit),
        description: "อนุญาตให้นักเรียนแก้ไขชื่อ-นามสกุลตนเองในหน้าโปรไฟล์",
        category: "STUDENT",
      },
    ];

    await prisma.$transaction(
      settingsToUpdate.map((s) =>
        prisma.systemSetting.upsert({
          where: { key: s.key },
          update: {
            value: s.value,
            description: s.description,
            category: s.category,
            updatedBy: currentUser.username,
          },
          create: {
            key: s.key,
            value: s.value,
            description: s.description,
            category: s.category,
            updatedBy: currentUser.username,
          },
        })
      )
    );

    invalidateSettingsCache();

    // บันทึก Audit Log
    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "UPDATE_SETTINGS",
      targetType: "SETTINGS",
      details: `อัปเดตการตั้งค่าระบบ (โหมดบำรุงรักษา: ${
        maintenanceMode ? "เปิดใช้งาน" : "ปิดใช้งาน"
      }, ภาคเรียน: ${academicTerm}, ไฟล์สูงสุด: ${maxUploadSizeMb} MB)`,
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/dashboard");
    revalidatePath("/student/dashboard");

    const updated = await getSystemSettings();

    return {
      success: true,
      message: "บันทึกการตั้งค่าระบบเรียบร้อยแล้ว",
      settings: updated,
    };
  } catch (error) {
    console.error("updateSystemSettingsAction error:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการบันทึกการตั้งค่า",
    };
  }
}
