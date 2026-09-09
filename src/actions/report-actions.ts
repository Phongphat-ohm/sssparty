"use server";

import { requireAdminPermission } from "@/lib/auth/permissions-server";
import {
  generateAssignmentReportPdf,
  generateAttendanceSessionReportPdf,
  generateAttendanceSummaryReportPdf,
  generateEvaluationReportPdf,
} from "@/lib/export/report-api-service";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getAppBaseUrl } from "@/lib/utils/url";

async function getRequestBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // Fallback to centralized getAppBaseUrl
  }
  return getAppBaseUrl();
}

/**
 * ครูยืนยันบันทึกรายงานผลการส่งงานฉบับสมบูรณ์ (Official) ลง S3 และออกรหัสรายงานพร้อม QR Code
 */
export async function saveOfficialAssignmentReportAction(params: {
  assignmentId: string;
  filterClass?: string;
}) {
  try {
    const authCheck = await requireAdminPermission("MANAGE_ASSIGNMENTS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;
    const baseUrl = await getRequestBaseUrl();

    const result = await generateAssignmentReportPdf({
      assignmentId: params.assignmentId,
      filterClass: params.filterClass || "ALL",
      isOfficial: true,
      user: { id: currentUser.id, username: currentUser.username, name: currentUser.name },
      baseUrl,
    });

    revalidatePath("/admin/reports");
    revalidatePath(`/admin/assignments/${params.assignmentId}/submissions`);

    return {
      success: true,
      message: `บันทึกรายงานฉบับสมบูรณ์สำเร็จ (รหัสเอกสาร: ${result.reportCode})`,
      reportCode: result.reportCode,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
    };
  } catch (error: any) {
    console.error("saveOfficialAssignmentReportAction error:", error);
    return {
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการบันทึกรายงานฉบับสมบูรณ์",
    };
  }
}

/**
 * ครูยืนยันบันทึกรายงานการเช็กชื่อฉบับสมบูรณ์ (Official) ลง S3 และออกรหัสรายงานพร้อม QR Code
 */
export async function saveOfficialAttendanceReportAction(params: {
  sessionId: string;
  filterClass?: string;
}) {
  try {
    const authCheck = await requireAdminPermission("MANAGE_ATTENDANCE");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;
    const baseUrl = await getRequestBaseUrl();

    const result = await generateAttendanceSessionReportPdf({
      sessionId: params.sessionId,
      filterClass: params.filterClass || "ALL",
      isOfficial: true,
      user: { id: currentUser.id, username: currentUser.username, name: currentUser.name },
      baseUrl,
    });

    revalidatePath("/admin/reports");
    revalidatePath(`/admin/attendance/${params.sessionId}`);

    return {
      success: true,
      message: `บันทึกรายงานฉบับสมบูรณ์สำเร็จ (รหัสเอกสาร: ${result.reportCode})`,
      reportCode: result.reportCode,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
    };
  } catch (error: any) {
    console.error("saveOfficialAttendanceReportAction error:", error);
    return {
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการบันทึกรายงานฉบับสมบูรณ์",
    };
  }
}

/**
 * ครูยืนยันบันทึกรายงานประเมินผลรวมฉบับสมบูรณ์ (Official) ลง S3 และออกรหัสรายงานพร้อม QR Code
 */
export async function saveOfficialEvaluationReportAction(params: {
  filterClass?: string;
}) {
  try {
    const authCheck = await requireAdminPermission("VIEW_REPORTS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;
    const baseUrl = await getRequestBaseUrl();

    const result = await generateEvaluationReportPdf({
      filterClass: params.filterClass || "ALL",
      isOfficial: true,
      user: { id: currentUser.id, username: currentUser.username, name: currentUser.name },
      baseUrl,
    });

    revalidatePath("/admin/reports");

    return {
      success: true,
      message: `บันทึกรายงานฉบับสมบูรณ์สำเร็จ (รหัสเอกสาร: ${result.reportCode})`,
      reportCode: result.reportCode,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
    };
  } catch (error: any) {
    console.error("saveOfficialEvaluationReportAction error:", error);
    return {
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการบันทึกรายงานฉบับสมบูรณ์",
    };
  }
}

/**
 * ครูยืนยันบันทึกรายงานสรุปเวลาเรียนสะสมรวมทุกคาบฉบับสมบูรณ์ (Official) ลง S3 และออกรหัสรายงานพร้อม QR Code
 */
export async function saveOfficialAttendanceSummaryReportAction(params: {
  filterClass?: string;
}) {
  try {
    const authCheck = await requireAdminPermission("MANAGE_ATTENDANCE");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;
    const baseUrl = await getRequestBaseUrl();

    const result = await generateAttendanceSummaryReportPdf({
      filterClass: params.filterClass || "ALL",
      isOfficial: true,
      user: { id: currentUser.id, username: currentUser.username, name: currentUser.name },
      baseUrl,
    });

    revalidatePath("/admin/reports");
    revalidatePath("/admin/attendance");

    return {
      success: true,
      message: `บันทึกรายงานฉบับสมบูรณ์สำเร็จ (รหัสเอกสาร: ${result.reportCode})`,
      reportCode: result.reportCode,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
    };
  } catch (error: any) {
    console.error("saveOfficialAttendanceSummaryReportAction error:", error);
    return {
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการบันทึกรายงานฉบับสมบูรณ์",
    };
  }
}

