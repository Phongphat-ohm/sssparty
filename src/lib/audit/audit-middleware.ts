import { getAuthSession } from "@/lib/auth/session";
import { AuthTokenPayload } from "@/lib/auth/jwt";
import {
  createAuditLog,
  getClientRequestContext,
  AuditActionType,
  AuditTargetType,
} from "./logger";
import { NextRequest, NextResponse } from "next/server";

export interface AuditContext {
  session: AuthTokenPayload | null;
  clientContext: { ipAddress: string; userAgent: string };
  startTime: number;
}

export interface AuditActionConfig<TResult = any> {
  action: AuditActionType;
  targetType?: AuditTargetType;
  targetId?: string | ((result: TResult) => string | undefined);
  getDetails?: (result: TResult, context: AuditContext) => any;
  failedAction?: AuditActionType;
  userOverride?: {
    id?: string | null;
    username?: string | null;
    role?: "ADMIN" | "STUDENT" | null;
  };
}

/**
 * auditAction: มิดเดิลแวร์กลางสำหรับ Server Actions ทั้งหมด
 * - ดึง Session, Client IP, User-Agent อัตโนมัติ
 * - จับเวลา Latency (durationMs)
 * - บันทึก Log สำเร็จ (SUCCESS), ล้มเหลว (FAILED), หรือข้อผิดพลาด (SYSTEM_ERROR) อัตโนมัติ
 * - ป้องกันไม่ให้ข้อผิดพลาดของ Log กระทบการทำงานหลักของระบบ
 */
export async function auditAction<TResult = any>(
  config: AuditActionConfig<TResult>,
  fn: (context: AuditContext) => Promise<TResult>
): Promise<TResult> {
  const startTime = Date.now();
  let session: AuthTokenPayload | null = null;
  let clientContext = { ipAddress: "unknown", userAgent: "unknown" };

  try {
    session = await getAuthSession();
    clientContext = await getClientRequestContext();
  } catch (ctxErr) {
    console.warn("[AuditMiddleware] Failed to extract request context:", ctxErr);
  }

  const context: AuditContext = {
    session,
    clientContext,
    startTime,
  };

  const userId =
    config.userOverride?.id !== undefined
      ? config.userOverride.id
      : session?.role === "ADMIN"
      ? session.userId
      : null;

  const username =
    config.userOverride?.username !== undefined
      ? config.userOverride.username
      : session?.username || null;

  const role =
    config.userOverride?.role !== undefined
      ? config.userOverride.role
      : session?.role || null;

  try {
    const result = await fn(context);
    const durationMs = Date.now() - startTime;

    const targetId =
      typeof config.targetId === "function"
        ? config.targetId(result)
        : config.targetId;

    // ตรวจสอบว่าผลลัพธ์ระบุ success: false หรือไม่ (Logical failure)
    const resObj = typeof result === "object" && result !== null ? (result as Record<string, any>) : null;
    const isLogicalFailure = resObj !== null && resObj.success === false;

    if (isLogicalFailure) {
      const actionName = config.failedAction || (`${config.action}_FAILED` as AuditActionType);
      const details =
        config.getDetails?.(result, context) ??
        (resObj.message ? `การดำเนินงานไม่สำเร็จ: ${resObj.message}` : "การดำเนินงานไม่สำเร็จ");

      // บันทึก Log แบบ Asynchronous Non-blocking
      void createAuditLog({
        userId,
        username,
        role,
        action: actionName,
        targetType: config.targetType || "SYSTEM",
        targetId: targetId || null,
        details,
        ipAddress: clientContext.ipAddress,
        userAgent: clientContext.userAgent,
        durationMs,
        status: "FAILED",
      });
    } else {
      // ทำรายการสำเร็จ (Success)
      const details = config.getDetails?.(result, context) ?? (resObj?.message || null);

      void createAuditLog({
        userId,
        username,
        role,
        action: config.action,
        targetType: config.targetType || "SYSTEM",
        targetId: targetId || null,
        details,
        ipAddress: clientContext.ipAddress,
        userAgent: clientContext.userAgent,
        durationMs,
        status: "SUCCESS",
      });
    }

    return result;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error(`[AuditMiddleware Unhandled Exception in ${config.action}]:`, error);

    // บันทึกกรณีเกิด Unhandled Exception
    void createAuditLog({
      userId,
      username,
      role,
      action: "SYSTEM_ERROR",
      targetType: config.targetType || "SYSTEM",
      targetId: typeof config.targetId === "string" ? config.targetId : null,
      details: JSON.stringify({
        actionAttempted: config.action,
        error: error?.message || "Internal Server Error",
        stack: error?.stack?.slice(0, 500) || null,
      }),
      ipAddress: clientContext.ipAddress,
      userAgent: clientContext.userAgent,
      durationMs,
      status: "ERROR",
    });

    // ถ้า error เป็น object ให้ return error response กลับไปหากระทำได้ ป้องกัน Client Crash
    throw error;
  }
}

/**
 * withAuditApi: มิดเดิลแวร์สำหรับ Next.js Route Handlers (/api/...)
 */
export function withAuditApi(
  config: {
    action: AuditActionType;
    targetType: AuditTargetType;
    getTargetId?: (req: NextRequest, params?: any) => string | undefined;
  },
  handler: (
    req: NextRequest,
    context: { params?: any; audit: (details: any, actionOverride?: AuditActionType) => Promise<void> }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, routeParams: any) => {
    const startTime = Date.now();
    let session: AuthTokenPayload | null = null;
    const clientContext = await getClientRequestContext();

    try {
      session = await getAuthSession();
    } catch {
      // anonymous
    }

    const userId = session?.role === "ADMIN" ? session.userId : null;
    const username = session?.username || null;
    const role = session?.role || null;
    const targetId = config.getTargetId?.(req, routeParams?.params);

    const auditLogger = async (details: any, actionOverride?: AuditActionType) => {
      await createAuditLog({
        userId,
        username,
        role,
        action: actionOverride || config.action,
        targetType: config.targetType,
        targetId: targetId || null,
        details,
        ipAddress: clientContext.ipAddress,
        userAgent: clientContext.userAgent,
        durationMs: Date.now() - startTime,
      });
    };

    try {
      return await handler(req, { ...routeParams, audit: auditLogger });
    } catch (error: any) {
      await createAuditLog({
        userId,
        username,
        role,
        action: "SYSTEM_ERROR",
        targetType: config.targetType,
        targetId: targetId || null,
        details: JSON.stringify({
          url: req.url,
          error: error?.message,
        }),
        ipAddress: clientContext.ipAddress,
        userAgent: clientContext.userAgent,
        durationMs: Date.now() - startTime,
        status: "ERROR",
      });
      throw error;
    }
  };
}
