/**
 * รวมศูนย์ค่าคงที่มาตรฐานและค่าเริ่มต้นของระบบ (System Defaults & Constants)
 * เพื่อป้องกันปัญหา Hardcode กระจายทั่วทั้งโปรเจกต์
 */

export const DEFAULT_ACADEMIC_TERM = "1/2569";
export const DEFAULT_TEACHER_NAME = "ครูที่ปรึกษาชุมนุม";
export const DEFAULT_SITE_NAME = "3S Party - ชุมนุมสื่อสร้างสรรค์";
export const DEFAULT_CUTOFF_TIME = "08:30";
export const DEFAULT_ATTENDANCE_RADIUS = 100;
export const DEFAULT_MIN_ATTENDANCE_PERCENT = 80;
export const DEFAULT_MAX_UPLOAD_SIZE_MB = 50;
export const DEFAULT_ALLOWED_FILE_TYPES = "pdf, zip, png, jpg, jpeg, mp4, docx, pptx";

/**
 * พิกัดเริ่มต้นสำหรับแผนที่ (ศูนย์กลางประเทศไทย / กรุงเทพมหานคร)
 */
export const DEFAULT_MAP_CENTER = {
  lat: 13.7563,
  lng: 100.5018,
};
