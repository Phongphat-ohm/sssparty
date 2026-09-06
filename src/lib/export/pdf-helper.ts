"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface PdfExportOptions {
  filename: string;
  orientation?: "portrait" | "landscape";
  title?: string;
}

/**
 * ส่งออก HTML Element เป็นไฟล์ PDF คุณภาพสูง (รองรับภาษาไทย 100% ผ่าน Browser Font Engine)
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: PdfExportOptions
): Promise<void> {
  const { filename, orientation = "portrait" } = options;

  // 1. ถ่ายภาพ DOM เป็น Canvas ความคมชัดสูง (scale: 2)
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: element.scrollWidth,
  });

  // ขนาดกระดาษ A4 มาตรฐาน (หน่วย mm)
  const isLandscape = orientation === "landscape";
  const pdfWidth = isLandscape ? 297 : 210;
  const pdfHeight = isLandscape ? 210 : 297;
  const margin = 10; // ขอบกระดาษ 10mm

  const contentWidth = pdfWidth - margin * 2;
  const contentHeight = pdfHeight - margin * 2;

  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // 2. จัดการหน้ากระดาษ (Pagination)
  let heightLeft = imgHeight;
  let position = margin;
  let page = 1;

  // กรณีเนื้อหายาวเกิน 1 หน้า A4: ทำการแบ่งหน้าอย่างแม่นยำ
  if (imgHeight <= contentHeight) {
    // หน้าเดียว
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);
  } else {
    // หลายหน้า: ตัด Canvas แบ่งเป็นหน้าๆ
    const pageCanvasHeight = (canvas.width * contentHeight) / contentWidth;
    let currentSourceY = 0;

    while (currentSourceY < canvas.height) {
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.min(pageCanvasHeight, canvas.height - currentSourceY);

      const ctx = pageCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          currentSourceY,
          canvas.width,
          pageCanvas.height,
          0,
          0,
          pageCanvas.width,
          pageCanvas.height
        );

        const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95);
        const pageImgHeight = (pageCanvas.height * contentWidth) / canvas.width;

        if (page > 1) {
          pdf.addPage("a4", orientation);
        }

        pdf.addImage(pageImgData, "JPEG", margin, margin, contentWidth, pageImgHeight);
      }

      currentSourceY += pageCanvasHeight;
      page++;
    }
  }

  // 3. บันทึกและดาวน์โหลดไฟล์
  const finalFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  pdf.save(finalFilename);
}
