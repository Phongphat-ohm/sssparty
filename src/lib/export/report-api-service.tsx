import { prisma } from "@/lib/prisma/client";
import { getSystemSetting } from "@/lib/settings/system-settings";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET } from "@/lib/s3/client";
import { getNextReportCode } from "@/actions/reports-history";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { createAuditLog } from "@/lib/audit/logger";
import {
  AssignmentSubmissionsPdf,
  AssignmentSubmissionsPdfData,
} from "./pdf-templates/AssignmentSubmissionsPdf";
import {
  AttendanceSessionPdf,
  AttendanceSessionPdfData,
} from "./pdf-templates/AttendanceSessionPdf";
import {
  AttendanceSummaryPdf,
  AttendanceSummaryPdfData,
} from "./pdf-templates/AttendanceSummaryPdf";
import {
  ComprehensiveEvaluationPdfDocument,
} from "./comprehensive-evaluation-pdf";
import {
  getComprehensiveEvaluationReportDataAction,
  getAttendanceSummaryReportDataAction,
} from "@/actions/reports";
import { registerThaiFonts } from "./fonts";

// ตรวจสอบและลงทะเบียนฟอนต์ไทยทันที
registerThaiFonts();

interface ReportResult {
  pdfBuffer: Buffer;
  fileName: string;
  reportCode: string;
  isOfficial: boolean;
  s3Key?: string | null;
  fileUrl?: string | null;
}

/**
 * 1. สร้างเอกสารรายงานผลการส่งงานและการประเมินคะแนน (Assignment Submissions Report)
 * รองรับทั้งโหมด Preview (ไม่บันทึก S3/DB) และ Official (ออกรหัส, ทำ QR Code, อัปโหลด S3, บันทึก DB)
 */
export async function generateAssignmentReportPdf(params: {
  assignmentId: string;
  filterClass?: string;
  isOfficial?: boolean;
  user?: { id: string; username: string };
  baseUrl?: string;
}): Promise<ReportResult> {
  const { assignmentId, filterClass = "ALL", isOfficial = false, user, baseUrl } = params;

  // 1. ดึงข้อมูลภาระงาน
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
    throw new Error(`ไม่พบข้อมูลภาระงาน (ID: ${assignmentId})`);
  }

  // 2. ดึงข้อมูลนักเรียน
  const studentWhere: any = { status: "ACTIVE" };
  if (filterClass !== "ALL") {
    studentWhere.className = filterClass;
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    orderBy: [{ className: "asc" }, { studentNumber: "asc" }],
  });

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

  // 3. รหัสเอกสารและ QR Code
  let reportCode = "PREVIEW-DRAFT";
  let qrDataUrl: string | null = null;
  const siteOrigin = baseUrl || process.env.NEXTAUTH_URL || "https://sssparty.vercel.app";

  if (isOfficial) {
    reportCode = await getNextReportCode(academicTerm);
    const verifyUrl = `${siteOrigin}/verify/${reportCode}`;
    qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 200,
      errorCorrectionLevel: "M",
    });
  }

  // 4. ประกอบข้อมูลนักเรียนและสถิติ
  const totalStudents = students.length;
  let submittedCount = 0;
  let gradedCount = 0;
  let passedCount = 0;
  const scoresList: number[] = [];

  const subMap = new Map(assignment.submissions.map((s) => [s.studentId, s]));

  const mappedStudents = students.map((st) => {
    const sub = subMap.get(st.id);
    let submissionStatus: "SUBMITTED" | "LATE" | "DRAFT" | "NOT_SUBMITTED" | "RETURNED" = "NOT_SUBMITTED";
    let submittedAtStr = "";
    let score: number | null = null;
    let passed = false;

    if (sub) {
      if (sub.status === "RETURNED") {
        submissionStatus = "RETURNED";
      } else if (sub.status === "DRAFT") {
        submissionStatus = "DRAFT";
      } else {
        const isLate = sub.submittedAt.getTime() > assignment.dueDate.getTime();
        submissionStatus = isLate ? "LATE" : "SUBMITTED";
        submittedCount++;

        submittedAtStr = new Date(sub.submittedAt).toLocaleDateString("th-TH", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        if (sub.grade && typeof sub.grade.score === "number") {
          score = sub.grade.score;
          gradedCount++;
          scoresList.push(score);
          passed = score >= assignment.maxScore * 0.5;
          if (passed) passedCount++;
        }
      }
    }

    return {
      studentNumber: st.studentNumber,
      studentCode: st.studentCode,
      name: `${st.firstName} ${st.lastName}`,
      className: st.className,
      submissionStatus,
      submittedAtStr,
      score,
      passed,
    };
  });

  const avgScore =
    scoresList.length > 0
      ? Number((scoresList.reduce((a, b) => a + b, 0) / scoresList.length).toFixed(1))
      : 0;
  const maxAchievedScore = scoresList.length > 0 ? Math.max(...scoresList) : 0;
  const minAchievedScore = scoresList.length > 0 ? Math.min(...scoresList) : 0;

  const templateData: AssignmentSubmissionsPdfData = {
    reportCode,
    isOfficial,
    qrDataUrl,
    assignmentTitle: assignment.title,
    assignmentDescription: assignment.description,
    maxScore: assignment.maxScore,
    dueDateStr: formattedDueDate,
    submissionType: assignment.submissionType,
    academicTerm,
    clubName,
    targetClass: filterClass,
    printDateStr,
    printedByName: user?.username || "ผู้ดูแลระบบ",
    totalStudents,
    submittedCount,
    gradedCount,
    passedCount,
    avgScore,
    maxAchievedScore,
    minAchievedScore,
    students: mappedStudents,
  };

  // 5. Render In-Memory PDF ผ่าน @react-pdf/renderer
  registerThaiFonts();
  const pdfBuffer = await renderToBuffer(<AssignmentSubmissionsPdf data={templateData} />);

  const cleanTitle = assignment.title.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 30);
  const fileName = `${reportCode}_รายงานส่งงาน_${cleanTitle}_${filterClass}.pdf`;

  // 6. ถ้าเป็นโหมดทางการ (Official) ให้อัปโหลดเข้า S3 และบันทึกประวัติ
  let s3Key: string | null = null;
  let fileUrl: string | null = null;

  if (isOfficial) {
    const s3Folder = `reports/${academicTerm.replace("/", "-")}/assignments`;
    s3Key = `${s3Folder}/${fileName}`;

    if (S3_BUCKET) {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: pdfBuffer,
          ContentType: "application/pdf",
          ContentDisposition: `inline; filename="${encodeURIComponent(fileName)}"`,
        })
      );
      fileUrl = `/api/files/${s3Key}`;
    } else {
      fileUrl = `/api/export/assignments/${assignmentId}/render?mode=preview&className=${filterClass}`;
    }

    const metadataObj = {
      total: totalStudents,
      submitted: submittedCount,
      graded: gradedCount,
      passed: passedCount,
      avgScore,
      maxScore: assignment.maxScore,
      filterClass,
    };

    if (user?.id) {
      await prisma.generatedReport.create({
        data: {
          reportCode,
          reportType: "ASSIGNMENT_REPORT",
          title: `รายงานส่งงาน: ${assignment.title} (${filterClass === "ALL" ? "ทุกห้อง" : filterClass})`,
          academicTerm,
          targetClass: filterClass,
          assignmentId: assignment.id,
          fileKey: s3Key,
          fileUrl: fileUrl || "",
          fileSize: pdfBuffer.length,
          printedById: user.id,
          printedByName: user.username,
          metadata: JSON.stringify(metadataObj),
        },
      });

      await createAuditLog({
        userId: user.id,
        username: user.username,
        role: "ADMIN",
        action: "SAVE_OFFICIAL_REPORT",
        targetType: "ASSIGNMENT",
        targetId: assignment.id,
        details: JSON.stringify({
          reportCode,
          assignmentTitle: assignment.title,
          targetClass: filterClass,
          s3Key,
        }),
      });
    }
  }

  return {
    pdfBuffer,
    fileName,
    reportCode,
    isOfficial,
    s3Key,
    fileUrl,
  };
}

/**
 * 2. สร้างเอกสารรายงานการเช็กชื่อและเวลาเรียน (Attendance Session Report)
 */
export async function generateAttendanceSessionReportPdf(params: {
  sessionId: string;
  filterClass?: string;
  isOfficial?: boolean;
  user?: { id: string; username: string };
  baseUrl?: string;
}): Promise<ReportResult> {
  const { sessionId, filterClass = "ALL", isOfficial = false, user, baseUrl } = params;

  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      records: {
        include: {
          student: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error(`ไม่พบรอบการเช็กชื่อ (ID: ${sessionId})`);
  }

  const studentWhere: any = { status: "ACTIVE" };
  if (filterClass !== "ALL") {
    studentWhere.className = filterClass;
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    orderBy: [{ className: "asc" }, { studentNumber: "asc" }],
  });

  const academicTerm = session.academicTerm || (await getSystemSetting("academic_term")) || "1/2569";
  const clubName =
    (await getSystemSetting("site_name")) ||
    "ชุมนุมสื่อสร้างสรรค์ (3S Party – Creative Media Club)";

  const printDateStr = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const sessionDateStr = new Date(session.date).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let reportCode = "PREVIEW-DRAFT";
  let qrDataUrl: string | null = null;
  const siteOrigin = baseUrl || process.env.NEXTAUTH_URL || "https://sssparty.vercel.app";

  if (isOfficial) {
    reportCode = await getNextReportCode(academicTerm);
    const verifyUrl = `${siteOrigin}/verify/${reportCode}`;
    qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 200,
      errorCorrectionLevel: "M",
    });
  }

  const totalStudents = students.length;
  let presentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;
  let absentCount = 0;

  const recordMap = new Map(session.records.map((r) => [r.studentId, r]));

  const mappedStudents = students.map((st) => {
    const rec = recordMap.get(st.id);
    let status: "PRESENT" | "LATE" | "LEAVE" | "ABSENT" = "ABSENT";
    let checkedAtStr = "";
    let checkInMethod = "ยังไม่เช็กชื่อ";
    let distanceStr = "-";

    if (rec) {
      status = rec.status;
      if (status === "PRESENT") presentCount++;
      else if (status === "LATE") lateCount++;
      else if (status === "LEAVE") leaveCount++;
      else absentCount++;

      if (rec.checkedAt) {
        checkedAtStr = new Date(rec.checkedAt).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      }

      checkInMethod =
        rec.checkInMethod === "DYNAMIC_QR"
          ? "สแกน QR Code"
          : rec.checkInMethod === "DYNAMIC_KEY"
          ? "รหัส Key 6 หลัก"
          : rec.checkInMethod === "MANUAL"
          ? "ครูเช็กชื่อให้"
          : "-";

      if (rec.hasLocation && rec.distanceFromSession !== null && rec.distanceFromSession !== undefined) {
        distanceStr = `${rec.distanceFromSession} ม.`;
      }
    } else {
      absentCount++;
    }

    return {
      studentNumber: st.studentNumber,
      studentCode: st.studentCode,
      name: `${st.firstName} ${st.lastName}`,
      className: st.className,
      status,
      checkedAtStr,
      checkInMethod,
      distanceStr,
    };
  });

  const templateData: AttendanceSessionPdfData = {
    reportCode,
    isOfficial,
    qrDataUrl,
    sessionTitle: session.title,
    sessionDateStr,
    academicTerm,
    clubName,
    targetClass: filterClass,
    printDateStr,
    printedByName: user?.username || "ผู้ดูแลระบบ",
    totalStudents,
    presentCount,
    lateCount,
    leaveCount,
    absentCount,
    students: mappedStudents,
  };

  registerThaiFonts();
  const pdfBuffer = await renderToBuffer(<AttendanceSessionPdf data={templateData} />);

  const cleanTitle = session.title.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 30);
  const fileName = `${reportCode}_รายงานเช็กชื่อ_${cleanTitle}_${filterClass}.pdf`;

  let s3Key: string | null = null;
  let fileUrl: string | null = null;

  if (isOfficial) {
    const s3Folder = `reports/${academicTerm.replace("/", "-")}/attendance`;
    s3Key = `${s3Folder}/${fileName}`;

    if (S3_BUCKET) {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: pdfBuffer,
          ContentType: "application/pdf",
          ContentDisposition: `inline; filename="${encodeURIComponent(fileName)}"`,
        })
      );
      fileUrl = `/api/files/${s3Key}`;
    } else {
      fileUrl = `/api/export/attendance/render?sessionId=${sessionId}&mode=preview&className=${filterClass}`;
    }

    const metadataObj = {
      total: totalStudents,
      present: presentCount,
      late: lateCount,
      leave: leaveCount,
      absent: absentCount,
      filterClass,
    };

    if (user?.id) {
      await prisma.generatedReport.create({
        data: {
          reportCode,
          reportType: "ATTENDANCE_REPORT",
          title: `รายงานเช็กชื่อ: ${session.title} (${filterClass === "ALL" ? "ทุกห้อง" : filterClass})`,
          academicTerm,
          targetClass: filterClass,
          fileKey: s3Key,
          fileUrl: fileUrl || "",
          fileSize: pdfBuffer.length,
          printedById: user.id,
          printedByName: user.username,
          metadata: JSON.stringify(metadataObj),
        },
      });

      await createAuditLog({
        userId: user.id,
        username: user.username,
        role: "ADMIN",
        action: "SAVE_OFFICIAL_REPORT",
        targetType: "ATTENDANCE",
        targetId: session.id,
        details: JSON.stringify({
          reportCode,
          sessionTitle: session.title,
          targetClass: filterClass,
          s3Key,
        }),
      });
    }
  }

  return {
    pdfBuffer,
    fileName,
    reportCode,
    isOfficial,
    s3Key,
    fileUrl,
  };
}

/**
 * 3. สร้างเอกสารรายงานประเมินผลการเรียนรู้รวม (Comprehensive Evaluation Report)
 */
export async function generateEvaluationReportPdf(params: {
  filterClass?: string;
  isOfficial?: boolean;
  user?: { id: string; username: string };
  baseUrl?: string;
}): Promise<ReportResult> {
  const { filterClass = "ALL", isOfficial = false, user, baseUrl } = params;

  const result = await getComprehensiveEvaluationReportDataAction(filterClass);
  if (!result.success || !result.data) {
    throw new Error(result.message || "ไม่สามารถดึงข้อมูลรายงานประเมินผลรวมได้");
  }

  const reportData = result.data;
  const academicTerm = reportData.academicTerm || "1/2569";

  let reportCode = "PREVIEW-DRAFT";
  let qrDataUrl: string | null = null;
  const siteOrigin = baseUrl || process.env.NEXTAUTH_URL || "https://sssparty.vercel.app";

  if (isOfficial) {
    reportCode = await getNextReportCode(academicTerm);
    const verifyUrl = `${siteOrigin}/verify/${reportCode}`;
    qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 200,
      errorCorrectionLevel: "M",
    });
  }

  registerThaiFonts();
  const pdfBuffer = await renderToBuffer(
    <ComprehensiveEvaluationPdfDocument
      data={reportData}
      reportCode={reportCode}
      isOfficial={isOfficial}
      qrDataUrl={qrDataUrl}
      printedByName={user?.username || "ผู้ดูแลระบบ"}
    />
  );

  const fileName = `${reportCode}_รายงานประเมินผลรวม_${filterClass}.pdf`;

  let s3Key: string | null = null;
  let fileUrl: string | null = null;

  if (isOfficial) {
    const s3Folder = `reports/${academicTerm.replace("/", "-")}/evaluation`;
    s3Key = `${s3Folder}/${fileName}`;

    if (S3_BUCKET) {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: pdfBuffer,
          ContentType: "application/pdf",
          ContentDisposition: `inline; filename="${encodeURIComponent(fileName)}"`,
        })
      );
      fileUrl = `/api/files/${s3Key}`;
    } else {
      fileUrl = `/api/export/evaluation/render?mode=preview&className=${filterClass}`;
    }

    const metadataObj = {
      total: reportData.totalStudents,
      passed: reportData.stats.passedCount,
      failed: reportData.stats.failedCount,
      avgAttendance: reportData.stats.avgAttendancePercentage,
      avgScore: reportData.stats.avgScorePercentage,
      filterClass,
    };

    if (user?.id) {
      await prisma.generatedReport.create({
        data: {
          reportCode,
          reportType: "EVALUATION_REPORT",
          title: `รายงานสรุปผลการประเมิน (${filterClass === "ALL" ? "ทุกห้อง" : filterClass})`,
          academicTerm,
          targetClass: filterClass,
          fileKey: s3Key,
          fileUrl: fileUrl || "",
          fileSize: pdfBuffer.length,
          printedById: user.id,
          printedByName: user.username,
          metadata: JSON.stringify(metadataObj),
        },
      });

      await createAuditLog({
        userId: user.id,
        username: user.username,
        role: "ADMIN",
        action: "SAVE_OFFICIAL_REPORT",
        targetType: "EVALUATION",
        targetId: null,
        details: JSON.stringify({
          reportCode,
          targetClass: filterClass,
          s3Key,
        }),
      });
    }
  }

  return {
    pdfBuffer,
    fileName,
    reportCode,
    isOfficial,
    s3Key,
    fileUrl,
  };
}

/**
 * 4. สร้างเอกสารรายงานสรุปเวลาเรียนรวมทุกคาบตลอดภาคเรียน (Cumulative Attendance Summary Report)
 */
export async function generateAttendanceSummaryReportPdf(params: {
  filterClass?: string;
  isOfficial?: boolean;
  user?: { id: string; username: string };
  baseUrl?: string;
}): Promise<ReportResult> {
  const { filterClass = "ALL", isOfficial = false, user, baseUrl } = params;

  const result = await getAttendanceSummaryReportDataAction(filterClass);
  if (!result.success || !result.data) {
    throw new Error(result.message || "ไม่สามารถดึงข้อมูลรายงานสรุปเวลาเรียนรวมได้");
  }

  const reportData = result.data;
  const academicTerm = reportData.academicTerm || "1/2569";
  const clubName =
    (await getSystemSetting("site_name")) ||
    "ชุมนุมสื่อสร้างสรรค์ (3S Party – Creative Media Club)";

  let reportCode = "PREVIEW-DRAFT";
  let qrDataUrl: string | null = null;
  const siteOrigin = baseUrl || process.env.NEXTAUTH_URL || "https://sssparty.vercel.app";

  if (isOfficial) {
    reportCode = await getNextReportCode(academicTerm);
    const verifyUrl = `${siteOrigin}/verify/${reportCode}`;
    qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 200,
      errorCorrectionLevel: "M",
    });
  }

  const printDateStr = new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const templateData: AttendanceSummaryPdfData = {
    reportCode,
    isOfficial,
    qrDataUrl,
    verifyUrl: isOfficial ? `${siteOrigin}/verify/${reportCode}` : null,
    clubName,
    academicTerm,
    targetClass: filterClass,
    printDateStr,
    printedByName: user?.username || "ผู้ดูแลระบบ",
    totalSessions: reportData.totalSessions,
    totalStudents: reportData.totalStudents,
    passedCount: reportData.stats.passedCount,
    failedCount: reportData.stats.failedCount,
    avgPercentage: reportData.stats.avgPercentage,
    sessions: reportData.sessions,
    students: reportData.students,
  };

  registerThaiFonts();
  const pdfBuffer = await renderToBuffer(<AttendanceSummaryPdf data={templateData} />);

  const fileName = `${reportCode}_รายงานสรุปเวลาเรียน_${filterClass}.pdf`;

  let s3Key: string | null = null;
  let fileUrl: string | null = null;

  if (isOfficial) {
    const s3Folder = `reports/${academicTerm.replace("/", "-")}/attendance-summary`;
    s3Key = `${s3Folder}/${fileName}`;

    if (S3_BUCKET) {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: pdfBuffer,
          ContentType: "application/pdf",
          ContentDisposition: `inline; filename="${encodeURIComponent(fileName)}"`,
        })
      );
      fileUrl = `/api/files/${s3Key}`;
    } else {
      fileUrl = `/api/export/attendance/render?type=summary&className=${filterClass}&mode=preview`;
    }

    const metadataObj = {
      totalStudents: reportData.totalStudents,
      totalSessions: reportData.totalSessions,
      passedCount: reportData.stats.passedCount,
      failedCount: reportData.stats.failedCount,
      avgPercentage: reportData.stats.avgPercentage,
    };

    if (user?.id) {
      await prisma.generatedReport.create({
        data: {
          reportCode,
          reportType: "ATTENDANCE_SUMMARY_REPORT",
          title: `รายงานสรุปเวลาเรียนสะสม (${filterClass === "ALL" ? "ทุกห้อง" : filterClass})`,
          academicTerm,
          targetClass: filterClass,
          fileKey: s3Key,
          fileUrl: fileUrl || "",
          fileSize: pdfBuffer.length,
          printedById: user.id,
          printedByName: user.username,
          metadata: JSON.stringify(metadataObj),
        },
      });

      await createAuditLog({
        userId: user.id,
        username: user.username,
        role: "ADMIN",
        action: "SAVE_OFFICIAL_REPORT",
        targetType: "ATTENDANCE",
        targetId: null,
        details: JSON.stringify({
          reportCode,
          targetClass: filterClass,
          s3Key,
        }),
      });
    }
  }

  return {
    pdfBuffer,
    fileName,
    reportCode,
    isOfficial,
    s3Key,
    fileUrl,
  };
}

