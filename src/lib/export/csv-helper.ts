import { NextResponse } from "next/server";

/**
 * แปลงข้อมูล Array 2 มิติ ให้เป็นข้อความ CSV มาตรฐานพร้อม UTF-8 BOM (\uFEFF)
 * สำหรับเปิดบน Microsoft Excel ได้โดยภาษาไทยไม่เพี้ยน
 */
export function generateCsvString(
  rows: (string | number | null | undefined)[][]
): string {
  const BOM = "\uFEFF"; // Byte Order Mark สำหรับ UTF-8

  const csvRows = rows.map((row) =>
    row
      .map((cell) => {
        if (cell === null || cell === undefined) {
          return "";
        }
        const str = String(cell);
        // หากมีเครื่องหมายคอมม่า (,), ดับเบิ้ลโควท ("), หรือขึ้นบรรทัดใหม่ (\n) ต้องครอบด้วย "" และ escape " เป็น ""
        if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );

  return BOM + csvRows.join("\r\n");
}

/**
 * สร้าง NextResponse สำหรับการดาวน์โหลดไฟล์ CSV
 */
export function createCsvResponse(csvContent: string, filename: string): NextResponse {
  const encodedFilename = encodeURIComponent(filename);

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
