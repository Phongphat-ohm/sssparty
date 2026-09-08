import { Font } from "@react-pdf/renderer";
import path from "path";
import fs from "fs";

/**
 * ลงทะเบียนฟอนต์ภาษาไทย (Sarabun & TH Sarabun New) สำหรับเอกสาร PDF
 * มีระบบค้นหาไฟล์ฟอนต์จาก Local Path พร้อม Fallback ผ่าน CDN อัตโนมัติ
 */
export function registerThaiFonts(): void {
  try {
    if (typeof Font.getRegisteredFontFamilies === "function") {
      const registered = Font.getRegisteredFontFamilies();
      if (registered.includes("Sarabun") && registered.includes("TH Sarabun New")) {
        return;
      }
    }

    const candidateRegular = [
      path.resolve(process.cwd(), "public", "fonts", "Sarabun-Regular.ttf"),
      path.resolve(__dirname, "../../../public/fonts/Sarabun-Regular.ttf"),
      path.resolve(process.cwd(), ".next", "standalone", "public", "fonts", "Sarabun-Regular.ttf"),
    ];

    const candidateBold = [
      path.resolve(process.cwd(), "public", "fonts", "Sarabun-Bold.ttf"),
      path.resolve(__dirname, "../../../public/fonts/Sarabun-Bold.ttf"),
      path.resolve(process.cwd(), ".next", "standalone", "public", "fonts", "Sarabun-Bold.ttf"),
    ];

    const regularPath = candidateRegular.find((p) => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    });

    const boldPath = candidateBold.find((p) => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    });

    // Fallback สู่ CDN หากรันบนสภาพแวดล้อมที่หาไฟล์ใน Disk ไม่พบ
    const cdnRegular = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/Sarabun-Regular.ttf";
    const cdnBold = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/Sarabun-Bold.ttf";

    const regularSrc = regularPath || cdnRegular;
    const boldSrc = boldPath || cdnBold;

    // ลงทะเบียน Sarabun
    Font.register({
      family: "Sarabun",
      fonts: [
        { src: regularSrc, fontWeight: "normal" },
        { src: boldSrc, fontWeight: "bold" },
      ],
    });

    // ลงทะเบียน TH Sarabun New เป็น alias เพื่อความเข้ากันได้ 100%
    Font.register({
      family: "TH Sarabun New",
      fonts: [
        { src: regularSrc, fontWeight: "normal" },
        { src: boldSrc, fontWeight: "bold" },
      ],
    });
  } catch (err) {
    console.error("Failed to register Thai fonts in @react-pdf/renderer:", err);
  }
}

// เรียกทันทีเมื่อ Module ถูก Import
registerThaiFonts();
