import { pool } from "../src/lib/prisma/client";

async function main() {
  const client = await pool.connect();
  try {
    console.log("Applying database migration for system_settings...");
    
    // 1. Add MANAGE_SETTINGS enum value
    await client.query(`
      ALTER TYPE "AdminPermission" ADD VALUE IF NOT EXISTS 'MANAGE_SETTINGS';
    `);

    // 2. Create system_settings table
    await client.query(`
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

    // 3. Create Index
    await client.query(`
      CREATE INDEX IF NOT EXISTS "system_settings_category_idx" ON "system_settings"("category");
    `);

    // 4. Seed initial default settings
    const defaultSettings = [
      {
        key: "maintenance_mode",
        value: "false",
        description: "เปิด/ปิดโหมดปรับปรุงระบบ (Maintenance Mode)",
        category: "MAINTENANCE",
      },
      {
        key: "maintenance_message",
        value: "ระบบกำลังปิดปรับปรุงชั่วคราว เพื่อพัฒนาระบบให้ดียิ่งขึ้น ขออภัยในความไม่สะดวกครับ",
        description: "ข้อความแจ้งเตือนที่แสดงบนหน้าแจ้งปรับปรุงระบบ",
        category: "MAINTENANCE",
      },
      {
        key: "maintenance_expected_end",
        value: "",
        description: "เวลาที่คาดว่าจะเปิดระบบตามปกติ (เช่น 18:00 น.)",
        category: "MAINTENANCE",
      },
      {
        key: "site_name",
        value: "3S Party - ชุมนุมสื่อสร้างสรรค์",
        description: "ชื่อระบบหรือชื่อชุมนุม",
        category: "GENERAL",
      },
      {
        key: "academic_term",
        value: "1/2569",
        description: "ภาคเรียนปัจจุบันสำหรับใช้เป็นค่าเริ่มต้นในระบบ",
        category: "ACADEMIC",
      },
      {
        key: "max_upload_size_mb",
        value: "50",
        description: "ขนาดไฟล์ส่งงานสูงสุดที่อนุญาต (MB)",
        category: "UPLOAD",
      },
      {
        key: "allow_student_name_edit",
        value: "true",
        description: "อนุญาตให้นักเรียนแก้ไขชื่อ-นามสกุลตนเองในหน้าโปรไฟล์",
        category: "STUDENT",
      },
    ];

    for (const s of defaultSettings) {
      await client.query(`
        INSERT INTO "system_settings" ("key", "value", "description", "category", "updatedAt")
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT ("key") DO NOTHING;
      `, [s.key, s.value, s.description, s.category]);
    }

    console.log("Migration and seeding completed successfully!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
