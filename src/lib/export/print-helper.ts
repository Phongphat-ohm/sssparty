/**
 * ตัวช่วยพิมพ์เอกสารรายงาน (Direct System Print & PDF Generator)
 * ไม่ใช้ html2canvas ทำให้ไม่มีปัญหาเรื่องฟังก์ชันสี oklab / lab
 * ให้คุณภาพงานพิมพ์และไฟล์ PDF แบบเวกเตอร์ คมชัด 100% ภาษาไทยถูกต้อง ไม่เพี้ยน
 */

export interface PrintDocumentOptions {
  title: string;
  orientation?: "portrait" | "landscape";
  htmlContent: string;
}

export function printDirectDocument(options: PrintDocumentOptions): void {
  const { title, orientation = "portrait", htmlContent } = options;

  const isLandscape = orientation === "landscape";

  // เปิดหน้าต่างใหม่เพื่อพิมพ์โดยตรง
  const printWindow = window.open("", "_blank", "width=1050,height=850");
  if (!printWindow) {
    alert("กรุณาอนุญาตให้เปิดหน้าต่างป๊อปอัป (Pop-up) บนเบราว์เซอร์เพื่อเปิดหน้าระบบพิมพ์");
    return;
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap');

    @page {
      size: ${isLandscape ? "A4 landscape" : "A4 portrait"};
      margin: 10mm 10mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: #e5e5e5;
      color: #000000;
      font-family: 'TH Sarabun New', 'THSarabunNew', 'TH Sarabun PSK', 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14pt;
      line-height: 1.35;
    }

    /* แถบเครื่องมือควบคุมด้านบน (ซ่อนอัตโนมัติเมื่อสั่งพิมพ์) */
    .print-toolbar {
      position: sticky;
      top: 0;
      background-color: #1a1a1a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 99999;
      font-family: 'TH Sarabun New', 'Sarabun', sans-serif;
    }

    .print-toolbar .doc-title {
      font-size: 14px;
      font-weight: 600;
      color: #f0f0f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .print-toolbar .actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .print-btn {
      background-color: #ffffff;
      color: #000000;
      border: 1px solid #ffffff;
      border-radius: 8px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .print-btn:hover {
      background-color: #f0f0f0;
      transform: scale(1.02);
    }

    .close-btn {
      background-color: transparent;
      color: #cccccc;
      border: 1px solid #555555;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .close-btn:hover {
      background-color: #333333;
      color: #ffffff;
    }

    /* แผ่นกระดาษ A4 เสมือนจริง */
    .paper-container {
      padding: 24px 16px;
      min-width: 100%;
      box-sizing: border-box;
      overflow-x: auto;
    }

    .paper-sheet {
      background-color: #ffffff;
      color: #000000;
      width: ${isLandscape ? "1040px" : "800px"};
      max-width: 100%;
      margin: 0 auto;
      padding: 28px 36px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      border-radius: 4px;
      min-height: 800px;
      box-sizing: border-box;
    }

    /* ตารางขาว-ดำมาตรฐานทางการ (Font: TH Sarabun New) */
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000000;
      margin: 12px 0;
      font-size: 12pt;
    }

    table.report-table thead {
      display: table-header-group;
    }

    table.report-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    table.report-table th {
      border: 1px solid #000000;
      padding: 6px 5px;
      background-color: #f0f0f0;
      color: #000000;
      font-weight: 700;
      text-align: center;
    }

    table.report-table td {
      border: 1px solid #000000;
      padding: 5px 6px;
      color: #000000;
    }

    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .font-mono { font-family: monospace; }

    /* กรอบสถิติภาพรวม (Summary Box) ขาว-ดำ */
    .summary-box {
      border: 1px solid #000000;
      padding: 10px 14px;
      margin: 12px 0;
      background-color: #fafafa;
      font-size: 13pt;
    }

    /* หัวเอกสารทางการ */
    .report-header {
      text-align: center;
      margin-bottom: 16px;
      border-bottom: 2px solid #000000;
      padding-bottom: 10px;
    }

    .report-header h1 {
      font-size: 18pt;
      margin: 4px 0;
      font-weight: 700;
      color: #000000;
    }

    .report-header h2 {
      font-size: 15pt;
      margin: 2px 0;
      font-weight: 700;
      color: #000000;
    }

    .report-header p {
      font-size: 13pt;
      margin: 3px 0;
      color: #111111;
    }

    /* ช่องลงชื่อ */
    .signature-container {
      margin-top: 32px;
      page-break-inside: avoid;
      break-inside: avoid;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .signature-block {
      width: 290px;
      text-align: center;
      font-size: 10.5pt;
      margin-left: auto;
    }

    .signature-space {
      height: 45px;
    }

    /* เมื่อสั่งพิมพ์ ให้แสดงเฉพาะเนื้อหาเอกสาร พอดีหน้ากระดาษ */
    @media print {
      body {
        background-color: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .print-toolbar {
        display: none !important;
      }
      .paper-container {
        padding: 0 !important;
        margin: 0 !important;
      }
      .paper-sheet {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <div class="doc-title">
      <span>📄</span>
      <span>${title}</span>
    </div>
    <div class="actions">
      <button class="print-btn" onclick="window.print()">
        🖨️ พิมพ์เอกสาร / บันทึกเป็น PDF
      </button>
      <button class="close-btn" onclick="window.close()">
        ✕ ปิดหน้าต่าง
      </button>
    </div>
  </div>

  <div class="paper-container">
    <div class="paper-sheet">
      ${htmlContent}
    </div>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();
}
