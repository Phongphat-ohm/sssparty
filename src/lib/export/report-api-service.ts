import { prisma } from "@/lib/prisma/client";
import { getSystemSetting } from "@/lib/settings/system-settings";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET } from "@/lib/s3/client";
import { getNextReportCode } from "@/actions/reports-history";

interface RenderApiResponse {
  jobId: string;
  downloadUrl: string;
  expiresIn: number;
  fileType: string;
  status: string;
  isZipped: boolean;
}

/**
 * สร้างเอกสารรายงานผลการส่งงาน (Report 1) ผ่าน Template Rendering API ภายนอก
 * ดาวน์โหลดไฟล์ PDF อัปโหลดสำเนาเข้า S3 และบันทึกประวัติการจัดพิมพ์
 */
export async function generateAssignmentReportPdfViaApi(params: {
  assignmentId: string;
  filterClass?: string;
  customReportCode?: string;
  user?: { id: string; username: string };
}): Promise<{
  pdfBuffer: Buffer;
  fileName: string;
  downloadUrl: string;
  s3Key: string;
  fileUrl: string;
  reportCode: string;
}> {
  const { assignmentId, filterClass = "ALL", customReportCode, user } = params;

  const rawBaseUrl = process.env.REPORT_API_URL || "https://api-reports.ppkxb.space";
  const apiKey = process.env.REPORT_API_KEY;

  if (!apiKey) {
    throw new Error("REPORT_API_KEY ยังไม่ได้ถูกตั้งค่าใน .env");
  }

  // ต่อ Path /render/word/template ตามที่กำหนด
  const endpointUrl = `${rawBaseUrl.replace(/\/+$/, "")}/render/word/template`;

  // 1. ดึงข้อมูลภาระงานจากฐานข้อมูล
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      submissions: {
        include: {
          student: true,
          grade: true,
        },
      },
    },
  });

  if (!assignment) {
    throw new Error(`ไม่พบภาระงาน (Assignment ID: ${assignmentId})`);
  }

  // 2. ดึงข้อมูลนักเรียนทั้งหมด
  const studentWhere: any = { status: "ACTIVE" };
  if (filterClass !== "ALL") {
    studentWhere.className = filterClass;
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    orderBy: [{ className: "asc" }, { studentNumber: "asc" }],
  });

  // 3. ดึงการตั้งค่าระบบ (ภาคเรียน และ ชื่อชุมนุม)
  const academicTerm = (await getSystemSetting("academic_term")) || "1/2569";
  const clubName =
    (await getSystemSetting("site_name")) ||
    "ชุมนุมสื่อสร้างสรรค์ (3S Party – Creative Media Club)";

  const printDateStr = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedDueDate = assignment.dueDate
    ? new Date(assignment.dueDate).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น."
    : "-";

  // 4. ประกอบข้อมูลแถวนักเรียน และคำนวณสถิติ
  const total = students.length;
  let submittedCount = 0;
  let gradedCount = 0;
  const gradedScores: number[] = [];

  const tableRows = students.map((student, idx) => {
    const sub = assignment.submissions.find((s) => s.studentId === student.id);
    const hasSubmission = !!sub;
    const isGraded = sub?.status === "GRADED";
    const isLate = sub?.status === "LATE";
    const score = sub?.grade?.score;

    let statusText = "ยังไม่ส่ง";
    if (isGraded) {
      statusText = "ตรวจแล้ว";
      submittedCount++;
      gradedCount++;
      if (typeof score === "number") {
        gradedScores.push(score);
      }
    } else if (isLate) {
      statusText = "ส่งช้า";
      submittedCount++;
    } else if (hasSubmission) {
      statusText = "รอตรวจ";
      submittedCount++;
    }

    const hasScore = typeof score === "number";
    const percentStr =
      hasScore && assignment.maxScore > 0
        ? `${((score! / assignment.maxScore) * 100).toFixed(0)}%`
        : "-";

    const submittedAtStr = sub?.submittedAt
      ? new Date(sub.submittedAt).toLocaleDateString("th-TH", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

    return {
      index: String(idx + 1),
      stu_code: student.studentCode,
      stu_name: `${student.firstName} ${student.lastName}`,
      class: student.className,
      stu_no: String(student.studentNumber),
      status: statusText,
      submittedAtStr: submittedAtStr,
      score: hasScore ? String(score) : "-",
      percentage: percentStr,
    };
  });

  const unsubmittedCount = total - submittedCount;
  const avgScore =
    gradedScores.length > 0
      ? (gradedScores.reduce((a, b) => a + b, 0) / gradedScores.length).toFixed(1)
      : "-";
  const maxAttained = gradedScores.length > 0 ? Math.max(...gradedScores) : "-";
  const minAttained = gradedScores.length > 0 ? Math.min(...gradedScores) : "-";

  // รหัสยืนยันเอกสารราชการทางการ (ระบบสร้างอัตโนมัติตามปีการศึกษาเท่านั้น ห้ามสร้างหรือแก้ไขเอง)
  const termCode = academicTerm.replace(/\D/g, "") || "2569";
  const reportCode =
    (customReportCode && customReportCode.trim().startsWith(`DOC-3S-${termCode}-`))
      ? customReportCode.trim()
      : await getNextReportCode(academicTerm);

  const safeFileName = `รายงานผลการส่งงาน_${assignment.title.replace(/[\\/:*?"<>|]/g, "_")}_${
    filterClass === "ALL" ? "ทุกห้อง" : `ห้อง_${filterClass}`
  }`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sssparty.vercel.app";

  // 5. จัดเตรียม Request Payload
  const payload = {
    templateKey: "report1",
    fileName: safeFileName,
    zipOutput: false,
    replace: {
      clubName: clubName,
      academicTerm: academicTerm,
      targetGroupText:
        filterClass === "ALL" ? "นักเรียนทั้งหมดทุกห้อง" : `ห้อง ${filterClass}`,
      printDateStr: printDateStr,
      assignmentTitle: assignment.title,
      total: String(total),
      submitted: String(submittedCount),
      unsubmitted: String(unsubmittedCount),
      maxScore: String(assignment.maxScore),
      graded: String(gradedCount),
      avgScore: String(avgScore),
      formattedDueDate: formattedDueDate,
      maxAttained: String(maxAttained),
      minAttained: String(minAttained),
      report_code: reportCode,
      doc_code: reportCode,
      docCode: reportCode,
    },
    table: [
      {
        rows: tableRows,
        sort: [],
        verticalMerge: [],
        collapse: [],
        repeatHeader: true,
      },
    ],
    image: {},
    qrcode: {
      report_code: {
        text: `${appUrl}/verify/${reportCode}`,
        size: 130,
      },
    },
    barcode: {},
  };

  // 6. ส่งคำขอไปยัง Template Rendering API
  const apiRes = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!apiRes.ok) {
    const errText = await apiRes.text().catch(() => "");
    throw new Error(
      `ระบบสร้างรายงานภายนอกตอบกลับข้อผิดพลาด (${apiRes.status} ${apiRes.statusText}): ${errText || "Unauthorized / Server Error"}`
    );
  }

  const jsonResult: RenderApiResponse = await apiRes.json();

  if (jsonResult.status !== "success" || !jsonResult.downloadUrl) {
    throw new Error("การสร้างเอกสารไม่สำเร็จหรือไม่ได้รับลิงก์ดาวน์โหลดจาก API");
  }

  // 7. ดึงไฟล์ PDF จาก downloadUrl มาเก็บไว้ใน Memory Buffer เพื่อนำไปสตรีมเป็น Blob
  const pdfFetchRes = await fetch(jsonResult.downloadUrl);
  if (!pdfFetchRes.ok) {
    throw new Error(`ไม่สามารถดาวน์โหลดไฟล์ PDF จาก Storage ได้ (${pdfFetchRes.status})`);
  }

  const arrayBuffer = await pdfFetchRes.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);

  // 8. อัปโหลดไฟล์ PDF ขึ้นสู่ S3 Object Storage
  const s3Key = `reports/${termCode}/${reportCode}.pdf`;
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      })
    );
  } catch (s3Err) {
    console.error("Failed to upload report to S3:", s3Err);
  }

  const fileUrl = `/api/files/${s3Key}`;

  // 9. บันทึกประวัติการออกรายงานลงฐานข้อมูล (GeneratedReport & AuditLog)
  if (user) {
    try {
      await prisma.generatedReport.upsert({
        where: { reportCode },
        create: {
          reportCode,
          reportType: "ASSIGNMENT_REPORT",
          title: assignment.title,
          academicTerm,
          targetClass: filterClass,
          assignmentId: assignment.id,
          fileKey: s3Key,
          fileUrl,
          fileSize: pdfBuffer.byteLength,
          printedById: user.id,
          printedByName: user.username,
          metadata: JSON.stringify({
            total,
            submitted: submittedCount,
            unsubmitted: unsubmittedCount,
            graded: gradedCount,
            avgScore,
            maxAttained,
            minAttained,
          }),
        },
        update: {
          fileKey: s3Key,
          fileUrl,
          fileSize: pdfBuffer.byteLength,
          printedById: user.id,
          printedByName: user.username,
          metadata: JSON.stringify({
            total,
            submitted: submittedCount,
            unsubmitted: unsubmittedCount,
            graded: gradedCount,
            avgScore,
            maxAttained,
            minAttained,
          }),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          username: user.username,
          role: "ADMIN",
          action: "PRINT_REPORT",
          targetType: "ASSIGNMENT",
          targetId: assignment.id,
          details: JSON.stringify({
            reportCode,
            assignmentTitle: assignment.title,
            filterClass,
            fileUrl,
            fileSize: pdfBuffer.byteLength,
          }),
        },
      });
    } catch (dbErr) {
      console.error("Failed to record generated report in DB:", dbErr);
    }
  }

  return {
    pdfBuffer,
    fileName: `${safeFileName}.pdf`,
    downloadUrl: jsonResult.downloadUrl,
    s3Key,
    fileUrl,
    reportCode,
  };
}

/**
 * สร้างแบบรายงานสรุปเวลาเรียนกิจกรรมพัฒนาผู้เรียน (กิจกรรมชุมนุม) (Report 2) ผ่าน Qorstack Rendering API
 * ดาวน์โหลดไฟล์ PDF อัปโหลดสำเนาเข้า S3 และบันทึกประวัติการจัดพิมพ์
 */
export async function generateAttendanceSummaryReportPdfViaApi(params: {
  filterClass?: string;
  user?: { id: string; username: string };
}): Promise<{
  pdfBuffer: Buffer;
  fileName: string;
  downloadUrl: string;
  s3Key: string;
  fileUrl: string;
  reportCode: string;
}> {
  const { filterClass = "ALL", user } = params;

  const rawBaseUrl = process.env.REPORT_API_URL || "https://api-reports.ppkxb.space";
  const apiKey = process.env.REPORT_API_KEY;

  if (!apiKey) {
    throw new Error("REPORT_API_KEY ยังไม่ได้ถูกตั้งค่าใน .env");
  }

  const endpointUrl = `${rawBaseUrl.replace(/\/+$/, "")}/render/word/template`;

  // 1. ดึงการตั้งค่าระบบ
  const academicTerm = (await getSystemSetting("academic_term")) || "1/2569";
  const clubName =
    (await getSystemSetting("site_name")) ||
    "ชุมนุมสื่อสร้างสรรค์ (3S Party – Creative Media Club)";

  const printDateStr = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // 2. ดึงคาบกิจกรรมทั้งหมดของภาคเรียนนี้
  const sessions = await prisma.attendanceSession.findMany({
    where: { academicTerm },
    include: { records: true },
    orderBy: { date: "asc" },
  });

  // 3. ดึงนักเรียนทั้งหมด
  const studentWhere: any = { status: "ACTIVE" };
  if (filterClass !== "ALL") {
    studentWhere.className = filterClass;
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    orderBy: [{ className: "asc" }, { studentNumber: "asc" }],
  });

  const totalSessions = sessions.length;
  const totalStudents = students.length;

  let passCount = 0;

  const tableRows = students.map((student, idx) => {
    let present = 0;
    let late = 0;
    let leave = 0;
    let absent = 0;

    sessions.forEach((sess) => {
      const rec = sess.records.find((r) => r.studentId === student.id);
      if (rec) {
        if (rec.status === "PRESENT") present++;
        else if (rec.status === "LATE") late++;
        else if (rec.status === "LEAVE") leave++;
        else if (rec.status === "ABSENT") absent++;
      } else {
        absent++;
      }
    });

    const effectivePresent = present + late * 0.5;
    const percentageNum =
      totalSessions > 0 ? Number(((effectivePresent / totalSessions) * 100).toFixed(2)) : 0;
    const isPassed = percentageNum >= 80;
    if (isPassed) passCount++;

    return {
      no: String(idx + 1),
      stu_code: student.studentCode,
      name: `${student.firstName} ${student.lastName}`,
      class: student.className,
      number: String(student.studentNumber),
      present: String(present),
      leave: String(leave),
      absent: String(absent),
      sum_present: String(effectivePresent),
      percentage: `${percentageNum.toFixed(2)}%`,
      evaluation: isPassed ? "ผ่าน" : "ไม่ผ่าน (มส.)",
    };
  });

  const failCount = totalStudents - passCount;

  // รหัสยืนยันเอกสารราชการทางการ
  const termCode = academicTerm.replace(/\D/g, "") || "2569";
  const reportCode = await getNextReportCode(academicTerm);

  const safeFileName = `รายงานสรุปเวลาเรียนกิจกรรมชุมนุม_${termCode}_${
    filterClass === "ALL" ? "ทุกห้อง" : `ห้อง_${filterClass}`
  }`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sssparty.vercel.app";

  // 4. จัดเตรียม Request Payload สำหรับ report2
  const payload = {
    templateKey: "report2",
    fileName: safeFileName,
    zipOutput: false,
    replace: {
      clubName: clubName,
      academicTerm: academicTerm,
      targetGroupText:
        filterClass === "ALL" ? "นักเรียนทั้งหมดทุกห้อง" : `ห้อง ${filterClass}`,
      printDateStr: printDateStr,
      total_student: String(totalStudents),
      total_session: String(totalSessions),
      pass_count: String(passCount),
      fail_count: String(failCount),
      report_code: reportCode,
      doc_code: reportCode,
      docCode: reportCode,
    },
    table: [
      {
        rows: [],
        sort: [],
        verticalMerge: [],
        collapse: [],
        repeatHeader: false,
      },
      {
        rows: tableRows,
        sort: [],
        verticalMerge: [],
        collapse: [],
        repeatHeader: true,
      },
    ],
    image: {},
    qrcode: {
      report_code: {
        text: `${appUrl}/verify/${reportCode}`,
        size: 150,
      },
    },
    barcode: {},
  };

  // 5. ส่ง Request ไปยัง Qorstack API
  const apiRes = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!apiRes.ok) {
    const errorText = await apiRes.text();
    console.error("Qorstack Report API Error (report2):", errorText);
    throw new Error(
      `เกิดข้อผิดพลาดในการสร้างเอกสารรายงาน (HTTP ${apiRes.status}): ${errorText || apiRes.statusText}`
    );
  }

  const jsonResult: RenderApiResponse = await apiRes.json();
  if (jsonResult.status !== "success" || !jsonResult.downloadUrl) {
    throw new Error("API ไม่สามารถสร้างไฟล์ PDF ได้ หรือไม่พบ downloadUrl");
  }

  // 6. ดาวน์โหลดไฟล์ PDF มาเก็บใน Buffer
  const pdfFetchRes = await fetch(jsonResult.downloadUrl);
  if (!pdfFetchRes.ok) {
    throw new Error(`ไม่สามารถดาวน์โหลดไฟล์ PDF จาก Storage ได้ (${pdfFetchRes.status})`);
  }

  const arrayBuffer = await pdfFetchRes.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);

  // 7. อัปโหลดไฟล์ PDF ขึ้นสู่ S3 Object Storage
  const s3Key = `reports/${termCode}/${reportCode}.pdf`;
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      })
    );
  } catch (s3Err) {
    console.error("Failed to upload attendance report to S3:", s3Err);
  }

  const fileUrl = `/api/files/${s3Key}`;

  // 8. บันทึกข้อมูลลงตาราง GeneratedReport และ AuditLog
  if (user?.id) {
    try {
      await prisma.generatedReport.upsert({
        where: { reportCode },
        create: {
          reportCode,
          reportType: "ATTENDANCE_SUMMARY_REPORT",
          title: "แบบรายงานสรุปเวลาเรียนกิจกรรมพัฒนาผู้เรียน (กิจกรรมชุมนุม)",
          academicTerm,
          targetClass: filterClass,
          assignmentId: null,
          fileKey: s3Key,
          fileUrl,
          fileSize: pdfBuffer.byteLength,
          printedById: user.id,
          printedByName: user.username,
          metadata: JSON.stringify({
            totalStudents,
            totalSessions,
            passCount,
            failCount,
          }),
        },
        update: {
          fileKey: s3Key,
          fileUrl,
          fileSize: pdfBuffer.byteLength,
          printedById: user.id,
          printedByName: user.username,
          metadata: JSON.stringify({
            totalStudents,
            totalSessions,
            passCount,
            failCount,
          }),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          username: user.username,
          role: "ADMIN",
          action: "PRINT_REPORT",
          targetType: "ATTENDANCE_SESSION",
          targetId: "ALL",
          details: JSON.stringify({
            reportCode,
            reportType: "ATTENDANCE_SUMMARY_REPORT",
            filterClass,
            fileUrl,
            fileSize: pdfBuffer.byteLength,
          }),
        },
      });
    } catch (dbErr) {
      console.error("Failed to record generated attendance report in DB:", dbErr);
    }
  }

  return {
    pdfBuffer,
    fileName: `${safeFileName}.pdf`,
    downloadUrl: jsonResult.downloadUrl,
    s3Key,
    fileUrl,
    reportCode,
  };
}

