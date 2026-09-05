import { headers } from "next/headers";
import { prisma } from "@/lib/prisma/client";

export type AuditActionType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "CREATE_ASSIGNMENT"
  | "UPDATE_ASSIGNMENT"
  | "DELETE_ASSIGNMENT"
  | "PUBLISH_ASSIGNMENT"
  | "GRADE_SUBMISSION"
  | "UPDATE_GRADE"
  | "CREATE_STUDENT"
  | "UPDATE_STUDENT"
  | "DELETE_STUDENT"
  | "IMPORT_STUDENTS_CSV"
  | "CREATE_ATTENDANCE_SESSION"
  | "SAVE_ATTENDANCE_RECORD"
  | "DELETE_ATTENDANCE_SESSION"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "UPDATE_USER_PERMISSIONS"
  | "RESET_PASSWORD"
  | "TOGGLE_USER_STATUS"
  | "DELETE_USER"
  | "FILE_UPLOAD"
  | "UPDATE_SETTINGS";

export type AuditTargetType =
  | "AUTH"
  | "ASSIGNMENT"
  | "SUBMISSION"
  | "GRADE"
  | "STUDENT"
  | "ATTENDANCE"
  | "USER"
  | "FILE"
  | "SETTINGS";

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
}

/**
 * ดึง IP Address และ User Agent จาก Next.js request context
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
 * บันทึก Audit Log ลงฐานข้อมูลแบบ Asynchronous (Safe & Non-blocking)
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

    const detailsStr =
      typeof params.details === "object" && params.details !== null
        ? JSON.stringify(params.details)
        : params.details || null;

    let validUserId: string | null = null;
    if (params.userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { id: true },
      });
      if (userExists) {
        validUserId = params.userId;
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: validUserId,
        username: params.username || null,
        role: params.role || null,
        action: params.action,
        targetType: params.targetType || null,
        targetId: params.targetId || null,
        details: detailsStr,
        ipAddress: ipAddress || null,
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
      },
    });
  } catch (error) {
    // Log error locally so that user's core operations are never disrupted
    console.error("[AuditLog Error] Failed to write audit log:", error);
  }
}
