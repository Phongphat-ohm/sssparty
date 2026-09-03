/**
 * File Validation Layer สำหรับระบบส่งงานชุมนุมสื่อสร้างสรรค์ (SSSParty)
 * รองรับไฟล์ทุกรูปแบบที่จำเป็นต่อการเรียนและการส่งงาน: รูปภาพ, PDF, Word, Excel, PowerPoint, มัลติมีเดีย, ZIP
 */

// จำกัดขนาดไฟล์สูงสุด 50MB (50 * 1024 * 1024 Bytes) เพื่อรองรับไฟล์เอกสาร รูปภาพความละเอียดสูง และสไลด์นำเสนอ
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

// Whitelist นามสกุลไฟล์ที่อนุญาต
export const ALLOWED_EXTENSIONS = new Set([
  // 1. เอกสาร PDF
  "pdf",

  // 2. รูปภาพทุกรูปแบบ (Images)
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "svg",
  "heic",
  "heif",
  "ico",
  "tiff",
  "tif",

  // 3. Microsoft Word & เอกสารข้อความ (Documents)
  "docx",
  "doc",
  "odt",
  "rtf",
  "txt",

  // 4. Microsoft Excel & ตารางคำนวณ (Spreadsheets)
  "xlsx",
  "xls",
  "csv",
  "ods",

  // 5. Microsoft PowerPoint & สไลด์นำเสนอ (Presentations)
  "pptx",
  "ppt",
  "odp",

  // 6. ไฟล์บีบอัด (Archives)
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",

  // 7. วิดีโอ (Video)
  "mp4",
  "webm",
  "mov",
  "avi",
  "mkv",
  "m4v",
  "wmv",

  // 8. ไฟล์เสียง (Audio)
  "mp3",
  "wav",
  "m4a",
  "ogg",
  "aac",
  "flac",
]);

// Whitelist MIME Types
export const ALLOWED_MIME_TYPES = new Set([
  // PDF
  "application/pdf",

  // รูปภาพ
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
  "image/heic",
  "image/heif",
  "image/x-icon",
  "image/tiff",

  // Word & Text Documents
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.oasis.opendocument.text",
  "application/rtf",
  "text/rtf",
  "text/plain",

  // Excel & Spreadsheets
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "application/vnd.oasis.opendocument.spreadsheet",

  // PowerPoint & Presentations
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.oasis.opendocument.presentation",

  // มัลติมีเดีย (Video & Audio)
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/x-m4v",
  "video/x-ms-wmv",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/x-m4a",
  "audio/ogg",
  "audio/aac",
  "audio/flac",

  // บีบอัด (ZIP & Archives)
  "application/zip",
  "application/x-zip-compressed",
  "multipart/x-zip",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-7z-compressed",
  "application/x-tar",
  "application/gzip",
  "application/octet-stream",
]);

// นามสกุลไฟล์อันตรายที่ห้ามอัปโหลดเด็ดขาดเพื่อความปลอดภัยของระบบ
const FORBIDDEN_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "sh",
  "ps1",
  "vbs",
  "js",
  "mjs",
  "php",
  "phtml",
  "py",
  "com",
  "scr",
  "msi",
  "jar",
  "apk",
  "dll",
  "sys",
  "iso",
]);

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function sanitizeFileName(rawFileName: string): string {
  // ลบอักขระพิเศษที่ไม่ปลอดภัย แต่คงชื่อภาษาไทย ภาษาอังกฤษ ตัวเลข และนามสกุลไฟล์ไว้
  const baseName = rawFileName
    .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");
  return baseName.slice(0, 150);
}

/**
 * ตรวจสอบประเภทของไฟล์สำหรับแสดงผล UI และไอคอน
 */
export function getFileTypeCategory(fileName: string, mimeType?: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const mime = mimeType?.toLowerCase() || "";

  if (ext === "pdf" || mime.includes("pdf")) {
    return { type: "pdf", label: "เอกสาร PDF", color: "text-red-600 bg-red-50 border-red-200" };
  }
  if (["docx", "doc", "odt", "rtf", "txt"].includes(ext) || mime.includes("word") || mime.includes("text/plain")) {
    return { type: "word", label: "เอกสาร Word", color: "text-blue-600 bg-blue-50 border-blue-200" };
  }
  if (["xlsx", "xls", "csv", "ods"].includes(ext) || mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv")) {
    return { type: "excel", label: "ตาราง Excel", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  }
  if (["pptx", "ppt", "odp"].includes(ext) || mime.includes("presentation") || mime.includes("powerpoint")) {
    return { type: "powerpoint", label: "สไลด์ PowerPoint", color: "text-orange-600 bg-orange-50 border-orange-200" };
  }
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "heic", "heif", "ico", "tiff", "tif"].includes(ext) || mime.startsWith("image/")) {
    return { type: "image", label: "ไฟล์รูปภาพ", color: "text-amber-600 bg-amber-50 border-amber-200" };
  }
  if (["mp4", "webm", "mov", "avi", "mkv", "m4v", "wmv"].includes(ext) || mime.startsWith("video/")) {
    return { type: "video", label: "ไฟล์วิดีโอ", color: "text-rose-600 bg-rose-50 border-rose-200" };
  }
  if (["mp3", "wav", "m4a", "ogg", "aac", "flac"].includes(ext) || mime.startsWith("audio/")) {
    return { type: "audio", label: "ไฟล์เสียง", color: "text-teal-600 bg-teal-50 border-teal-200" };
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext) || mime.includes("zip") || mime.includes("compressed")) {
    return { type: "archive", label: "ไฟล์บีบอัด ZIP", color: "text-purple-600 bg-purple-50 border-purple-200" };
  }

  return { type: "other", label: "ไฟล์เอกสาร", color: "text-[#5A4D41] bg-[#FAF6F0] border-[#EADBCC]" };
}

/**
 * ตรวจสอบความถูกต้องของขนาดและประเภทไฟล์
 */
export function validateFileMeta(params: {
  fileName: string;
  fileSize: number;
  mimeType: string;
}): FileValidationResult {
  const { fileName, fileSize, mimeType } = params;

  if (!fileName || fileName.trim().length === 0) {
    return { isValid: false, error: "กรุณาระบุชื่อไฟล์" };
  }

  // 1. ตรวจสอบขนาดไฟล์ (ไม่เกิน 50MB)
  if (fileSize <= 0) {
    return { isValid: false, error: "ไฟล์ว่างเปล่า (0 Bytes)" };
  }

  if (fileSize > MAX_UPLOAD_SIZE) {
    const sizeInMB = (fileSize / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `ไฟล์มีขนาดใหญ่เกินกำหนด (${sizeInMB}MB) จำกัดขนาดสูงสุดไม่เกิน 50MB`,
    };
  }

  // 2. ตรวจสอบนามสกุลไฟล์
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) {
    return { isValid: false, error: "ไฟล์ต้องมีนามสกุลระบุประเภทไฟล์" };
  }

  if (FORBIDDEN_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      error: `ไม่อนุญาตให้อัปโหลดไฟล์นามสกุล .${ext} เนื่องจากเป็นไฟล์ประเภทสคริปต์/โปรแกรมที่อาจเป็นอันตราย`,
    };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      error: `ไม่อนุญาตให้อัปโหลดไฟล์นามสกุล .${ext} (ระบบรองรับ: รูปภาพ, PDF, Word, Excel, PowerPoint, มัลติมีเดีย และ ZIP)`,
    };
  }

  // 3. ตรวจสอบ MIME Type ป้องกันการปลอมแปลงประเภทไฟล์ที่เป็น executable
  const forbiddenMimes = [
    "application/x-msdownload",
    "application/x-sh",
    "text/javascript",
    "application/x-dosexec",
  ];
  if (mimeType && forbiddenMimes.includes(mimeType.toLowerCase())) {
    return { isValid: false, error: "ประเภทไฟล์ไม่ปลอดภัยต่อระบบ" };
  }

  return { isValid: true };
}
