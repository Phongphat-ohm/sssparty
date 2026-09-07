import { headers } from "next/headers";
import { getAuditDriver } from "./drivers";

export type AuditActionType =
  // 1. Authentication & Security
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGIN_BLOCKED_MAINTENANCE"
  | "LOGOUT"
  | "PASSWORD_CHANGE_SUCCESS"
  | "PASSWORD_CHANGE_FAILED"
  | "PASSWORD_RESET"
  | "UNAUTHORIZED_ACCESS"

  // 2. Attendance & Geofence
  | "CREATE_ATTENDANCE_SESSION"
  | "UPDATE_ATTENDANCE_SESSION"
  | "DELETE_ATTENDANCE_SESSION"
  | "START_DYNAMIC_KEY"
  | "STOP_DYNAMIC_KEY"
  | "STUDENT_CHECK_IN"
  | "CHECK_IN_FAILED"
  | "SAVE_ATTENDANCE_RECORD"
  | "BATCH_MARK_ABSENT"
  | "UPDATE_GEOFENCE"

  // 3. Assignments & Submissions
  | "CREATE_ASSIGNMENT"
  | "UPDATE_ASSIGNMENT"
  | "DELETE_ASSIGNMENT"
  | "PUBLISH_ASSIGNMENT"
  | "TOGGLE_ASSIGNMENT_STATUS"
  | "SUBMIT_ASSIGNMENT"
  | "RESUBMIT_ASSIGNMENT"
  | "RETURN_SUBMISSION"
  | "GRADE_SUBMISSION"
  | "UPDATE_GRADE"

  // 4. Student & User Management
  | "CREATE_STUDENT"
  | "UPDATE_STUDENT"
  | "TOGGLE_STUDENT_STATUS"
  | "DELETE_STUDENT"
  | "IMPORT_STUDENTS_CSV"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "UPDATE_USER_PERMISSIONS"
  | "RESET_PASSWORD"
  | "TOGGLE_USER_STATUS"
  | "DELETE_USER"

  // 5. Reports, Files, Settings & System
  | "SAVE_OFFICIAL_REPORT"
  | "DELETE_OFFICIAL_REPORT"
  | "EXPORT_CSV"
  | "EXPORT_GRADEBOOK"
  | "FILE_UPLOAD"
  | "UPDATE_SETTINGS"
  | "SYSTEM_ERROR";

export type AuditTargetType =
  | "AUTH"
  | "ASSIGNMENT"
  | "SUBMISSION"
  | "GRADE"
  | "STUDENT"
  | "ATTENDANCE"
  | "USER"
  | "REPORT"
  | "FILE"
  | "SETTINGS"
  | "SECURITY"
  | "SYSTEM";

export interface CreateAuditLogParams {
  userId?: string | null;
  username?: string | null;
  role?: "ADMIN" | "STUDENT" | null;
  action: AuditActionType | string;
  targetType?: AuditTargetType | string | null;
  targetId?: string | null;
  details?: string | Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  durationMs?: number | null;
  status?: "SUCCESS" | "FAILED" | "ERROR";
  createdAt?: Date;
}

/**
 * ดึง IP Address และ User Agent จาก Next.js request context (รองรับ Cloudflare, Reverse Proxy, Docker)
 */
export async function getClientRequestContext(): Promise<{
  ipAddress: string;
  userAgent: string;
}> {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const realIp = headerList.get("x-real-ip");
    const cfConnectingIp = headerList.get("cf-connecting-ip");

    const ipAddress =
      cfConnectingIp ||
      forwardedFor?.split(",")[0]?.trim() ||
      realIp ||
      "127.0.0.1";

    const userAgent = headerList.get("user-agent") || "unknown";

    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: "system", userAgent: "system" };
  }
}

/**
 * บันทึก Audit Log ผ่าน Pluggable Storage Driver แบบ Asynchronous Non-blocking (Safe & Non-blocking)
 */
export async function createAuditLog(
  params: CreateAuditLogParams
): Promise<void> {
  try {
    let { ipAddress, userAgent } = params;

    if (!ipAddress || !userAgent) {
      const clientContext = await getClientRequestContext();
      if (!ipAddress) ipAddress = clientContext.ipAddress;
      if (!userAgent) userAgent = clientContext.userAgent;
    }

    const payload = {
      ...params,
      ipAddress,
      userAgent,
    };

    const driver = getAuditDriver();
    await driver.write(payload);
  } catch (error) {
    // Fail-safe error boundary: Local console error only, never crash user operation
    console.error("[AuditLog Error] Failed in createAuditLog:", error);
  }
}
