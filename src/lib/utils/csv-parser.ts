export interface ParsedStudentRow {
  studentCode: string;
  firstName: string;
  lastName: string;
  className: string;
  studentNumber: number;
  isValid: boolean;
  error?: string;
}

/**
 * แปลงหัวตารางให้เป็นชื่อฟิลด์มาตรฐาน
 */
function normalizeHeader(header: string): string {
  const clean = header.trim().toLowerCase().replace(/['"]/g, "");
  if (
    clean === "studentcode" ||
    clean === "code" ||
    clean === "รหัสนักเรียน" ||
    clean === "รหัสประจำตัว" ||
    clean === "รหัส"
  ) {
    return "studentCode";
  }
  if (clean === "firstname" || clean === "name" || clean === "ชื่อ" || clean === "ชื่อจริง") {
    return "firstName";
  }
  if (clean === "lastname" || clean === "นามสกุล") {
    return "lastName";
  }
  if (
    clean === "classname" ||
    clean === "class" ||
    clean === "room" ||
    clean === "ห้อง" ||
    clean === "ชั้น" ||
    clean === "ชั้นเรียน" ||
    clean === "ระดับชั้น"
  ) {
    return "className";
  }
  if (clean === "studentnumber" || clean === "number" || clean === "no" || clean === "เลขที่") {
    return "studentNumber";
  }
  return clean;
}

/**
 * แยกคอลัมน์ในบรรทัด CSV โดยรองรับเครื่องหมายจุลภาค, เซมิโคลอน, แท็บ และเครื่องหมายคำพูด
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ""));
  return result;
}

/**
 * ฟังก์ชันหลักสำหรับแปลงข้อความ CSV หรือข้อความตารางเป็นรายการนักเรียน
 */
export function parseStudentCSV(csvContent: string): {
  rows: ParsedStudentRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
} {
  // 1. กำจัด UTF-8 BOM
  let content = csvContent.replace(/^\uFEFF/, "").trim();
  if (!content) {
    return { rows: [], totalRows: 0, validRows: 0, invalidRows: 0 };
  }

  // 2. แยกบรรทัด
  const rawLines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (rawLines.length === 0) {
    return { rows: [], totalRows: 0, validRows: 0, invalidRows: 0 };
  }

  // 3. ตรวจสอบ Delimiter อัตโนมัติ (comma, semicolon, tab)
  const firstLine = rawLines[0];
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (firstLine.includes(";") && !firstLine.includes(",")) delimiter = ";";

  // 4. แปลง Headers
  const rawHeaders = parseCSVLine(firstLine, delimiter);
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  const codeIdx = normalizedHeaders.indexOf("studentCode");
  const firstIdx = normalizedHeaders.indexOf("firstName");
  const lastIdx = normalizedHeaders.indexOf("lastName");
  const classIdx = normalizedHeaders.indexOf("className");
  const numIdx = normalizedHeaders.indexOf("studentNumber");

  const rows: ParsedStudentRow[] = [];
  const seenCodes = new Set<string>();
  const seenClassNumbers = new Set<string>();

  // เริ่มอ่านข้อมูลตั้งแต่บรรทัดที่ 1 (ข้าม Header)
  for (let i = 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    const columns = parseCSVLine(line, delimiter);

    // ข้ามบรรทัดว่าง
    if (columns.length === 0 || columns.every((c) => !c)) continue;

    const studentCode = (codeIdx !== -1 ? columns[codeIdx] : columns[0]) || "";
    const firstName = (firstIdx !== -1 ? columns[firstIdx] : columns[1]) || "";
    const lastName = (lastIdx !== -1 ? columns[lastIdx] : columns[2]) || "";
    const className = (classIdx !== -1 ? columns[classIdx] : columns[3]) || "";
    const rawNumber = (numIdx !== -1 ? columns[numIdx] : columns[4]) || "";
    const studentNumber = parseInt(rawNumber.replace(/\D/g, ""), 10);

    let isValid = true;
    let error = "";

    if (!studentCode || studentCode.length < 3) {
      isValid = false;
      error = "รหัสนักเรียนต้องมีอย่างน้อย 3 ตัวอักษร";
    } else if (!firstName) {
      isValid = false;
      error = "กรุณากรอกชื่อจริง";
    } else if (!lastName) {
      isValid = false;
      error = "กรุณากรอกนามสกุล";
    } else if (!className) {
      isValid = false;
      error = "กรุณาระบุชั้นเรียน เช่น ม.4/1";
    } else if (isNaN(studentNumber) || studentNumber <= 0) {
      isValid = false;
      error = "เลขที่ต้องเป็นจำนวนเต็มบวก";
    } else if (seenCodes.has(studentCode)) {
      isValid = false;
      error = `รหัสนักเรียน "${studentCode}" ซ้ำกับบรรทัดอื่นในไฟล์`;
    } else {
      const classNumKey = `${className}_${studentNumber}`;
      if (seenClassNumbers.has(classNumKey)) {
        isValid = false;
        error = `ห้อง ${className} เลขที่ ${studentNumber} ซ้ำกับบรรทัดอื่นในไฟล์`;
      } else {
        seenCodes.add(studentCode);
        seenClassNumbers.add(classNumKey);
      }
    }

    rows.push({
      studentCode,
      firstName,
      lastName,
      className,
      studentNumber: isNaN(studentNumber) ? 0 : studentNumber,
      isValid,
      error: error || undefined,
    });
  }

  const validRows = rows.filter((r) => r.isValid).length;
  const invalidRows = rows.length - validRows;

  return {
    rows,
    totalRows: rows.length,
    validRows,
    invalidRows,
  };
}

/**
 * สร้างไฟล์ Template CSV สำหรับให้ครูดาวน์โหลดไปกรอกข้อมูล
 */
export function generateStudentCSVTemplate(): string {
  const headers = "รหัสนักเรียน,ชื่อ,นามสกุล,ห้อง,เลขที่";
  const sample1 = "10006,ก้องภพ,สุขสมบูรณ์,ม.4/1,6";
  const sample2 = "10007,ชลธิชา,แสงอรุณ,ม.4/1,7";
  const sample3 = "20003,ธนกฤต,วงศ์สุวรรณ,ม.5/2,4";

  // ใส่ UTF-8 BOM (\uFEFF) เพื่อให้เปิดใน Microsoft Excel ภาษาไทยไม่เพี้ยน
  return `\uFEFF${headers}\n${sample1}\n${sample2}\n${sample3}\n`;
}
