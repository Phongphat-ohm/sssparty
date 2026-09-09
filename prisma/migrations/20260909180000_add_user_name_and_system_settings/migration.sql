-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" TEXT;

-- Seed additional system settings if not exists
INSERT INTO "system_settings" ("key", "value", "description", "category", "updatedAt")
VALUES 
  ('teacher_name', 'ครูพงศ์พัศ ประดิษฐ์', 'ชื่อ-นามสกุล ครูผู้สอนหรือครูที่ปรึกษาประจำชุมนุม สำหรับแสดงบนรายงานและหน้าหลัก', 'TEACHER', NOW()),
  ('school_name', '', 'ชื่อโรงเรียนหรือสถานศึกษาสำหรับแสดงบนหัวรายงานราชการ', 'GENERAL', NOW()),
  ('teacher_contact', '', 'ข้อมูลติดต่อคุณครู (เช่น Line ID, Facebook หรือเบอร์โทรศัพท์)', 'TEACHER', NOW()),
  ('min_attendance_percent', '80', 'เกณฑ์เวลาเรียนขั้นต่ำสำหรับผ่านกิจกรรมชุมนุม (%)', 'ACADEMIC', NOW()),
  ('default_attendance_radius', '100', 'รัศมีการเช็กชื่อผ่าน GPS เริ่มต้น (เมตร)', 'ATTENDANCE', NOW()),
  ('default_cutoff_time', '08:30', 'เวลาตัดรอบเช็กชื่อตรงเวลาเริ่มต้น', 'ATTENDANCE', NOW()),
  ('allowed_file_types', 'pdf, zip, png, jpg, jpeg, mp4, docx, pptx', 'ประเภทนามสกุลไฟล์ที่อนุญาตให้นักเรียนส่งงาน', 'UPLOAD', NOW()),
  ('allow_late_submissions', 'true', 'อนุญาตให้นักเรียนส่งงานล่าช้าหลังกำหนดส่งได้ (สถานะจะขึ้น LATE)', 'UPLOAD', NOW())
ON CONFLICT ("key") DO NOTHING;
