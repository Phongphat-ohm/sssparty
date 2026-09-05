-- AlterEnum
ALTER TYPE "AdminPermission" ADD VALUE IF NOT EXISTS 'MANAGE_SETTINGS';

-- CreateTable
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "system_settings_category_idx" ON "system_settings"("category");

-- Seed initial settings
INSERT INTO "system_settings" ("key", "value", "description", "category", "updatedAt")
VALUES 
  ('maintenance_mode', 'false', 'เปิด/ปิดโหมดปรับปรุงระบบ (Maintenance Mode)', 'MAINTENANCE', NOW()),
  ('maintenance_message', 'ระบบกำลังปิดปรับปรุงชั่วคราว เพื่อพัฒนาระบบให้ดียิ่งขึ้น ขออภัยในความไม่สะดวกครับ', 'ข้อความแจ้งเตือนที่แสดงบนหน้าแจ้งปรับปรุงระบบ', 'MAINTENANCE', NOW()),
  ('maintenance_expected_end', '', 'เวลาที่คาดว่าจะเปิดระบบตามปกติ', 'MAINTENANCE', NOW()),
  ('site_name', '3S Party - ชุมนุมสื่อสร้างสรรค์', 'ชื่อระบบหรือชื่อชุมนุม', 'GENERAL', NOW()),
  ('academic_term', '1/2569', 'ภาคเรียนปัจจุบันสำหรับใช้เป็นค่าเริ่มต้นในระบบ', 'ACADEMIC', NOW()),
  ('max_upload_size_mb', '50', 'ขนาดไฟล์ส่งงานสูงสุดที่อนุญาต (MB)', 'UPLOAD', NOW()),
  ('allow_student_name_edit', 'true', 'อนุญาตให้นักเรียนแก้ไขชื่อ-นามสกุลตนเองในหน้าโปรไฟล์', 'STUDENT', NOW())
ON CONFLICT ("key") DO NOTHING;
