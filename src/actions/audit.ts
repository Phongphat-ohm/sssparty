"use server";

import { prisma } from "@/lib/prisma/client";
import { requireAdminPermission } from "@/lib/auth/permissions-server";

export type AuditCategory =
  | "ALL"
  | "AUTH_SECURITY"
  | "ATTENDANCE"
  | "GRADING"
  | "USER_MGMT"
  | "REPORTS_FILES"
  | "SYSTEM";

const AUDIT_CATEGORY_ACTIONS: Record<Exclude<AuditCategory, "ALL">, string[]> = {
  AUTH_SECURITY: [
    "LOGIN_SUCCESS",
    "LOGIN_FAILED",
    "LOGOUT",
    "LOGIN_BLOCKED_MAINTENANCE",
    "PASSWORD_CHANGE_SUCCESS",
    "PASSWORD_CHANGE_FAILED",
    "UNAUTHORIZED_ACCESS",
  ],
  ATTENDANCE: [
    "CREATE_ATTENDANCE_SESSION",
    "UPDATE_ATTENDANCE_SESSION",
    "DELETE_ATTENDANCE_SESSION",
    "MANUAL_CHECK_IN",
    "CHECK_IN_KEY_USED",
    "CHECK_IN_FAILED",
    "SAVE_ATTENDANCE_RECORD",
  ],
  GRADING: [
    "GRADE_SUBMISSION",
    "UPDATE_GRADE",
    "DELETE_GRADE",
    "BATCH_GRADE",
    "RETURN_SUBMISSION",
    "RESUBMIT_ASSIGNMENT",
  ],
  USER_MGMT: [
    "CREATE_USER",
    "UPDATE_USER",
    "DELETE_USER",
    "UPDATE_USER_PERMISSIONS",
    "RESET_PASSWORD",
    "CREATE_STUDENT",
    "UPDATE_STUDENT",
    "DELETE_STUDENT",
    "UPDATE_STUDENT_STATUS",
    "IMPORT_STUDENTS_CSV",
  ],
  REPORTS_FILES: [
    "OFFICIAL_REPORT_GENERATED",
    "DELETE_OFFICIAL_REPORT",
    "FILE_DOWNLOADED",
    "EXCEL_EXPORT",
  ],
  SYSTEM: [
    "SYSTEM_CONFIG_UPDATED",
    "CACHE_PURGED",
  ],
};

export interface GetAuditLogsParams {
  page?: number;
  pageSize?: number;
  category?: string;
  action?: string;
  targetType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogItem {
  id: string;
  userId: string | null;
  username: string | null;
  role: "ADMIN" | "STUDENT" | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogsResult {
  success: boolean;
  message?: string;
  logs: AuditLogItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  stats: {
    totalLogs: number;
    loginSuccessCount: number;
    loginFailedCount: number;
    actionsTodayCount: number;
  };
}

function buildWhereClause(params: GetAuditLogsParams) {
  const whereClause: any = {};

  if (params.category && params.category !== "ALL") {
    const actions = AUDIT_CATEGORY_ACTIONS[params.category as Exclude<AuditCategory, "ALL">];
    if (actions && actions.length > 0) {
      whereClause.action = { in: actions };
    }
  }

  if (params.action && params.action !== "ALL") {
    whereClause.action = params.action;
  }

  if (params.targetType && params.targetType !== "ALL") {
    whereClause.targetType = params.targetType;
  }

  if (params.search && params.search.trim() !== "") {
    const search = params.search.trim();
    whereClause.OR = [
      { username: { contains: search, mode: "insensitive" } },
      { action: { contains: search, mode: "insensitive" } },
      { targetType: { contains: search, mode: "insensitive" } },
      { targetId: { contains: search, mode: "insensitive" } },
      { details: { contains: search, mode: "insensitive" } },
      { ipAddress: { contains: search, mode: "insensitive" } },
    ];
  }

  if (params.startDate || params.endDate) {
    whereClause.createdAt = {};
    if (params.startDate) {
      whereClause.createdAt.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.createdAt.lte = end;
    }
  }

  return whereClause;
}

/**
 * ดึงรายการ Audit Logs พร้อมการค้นหา, ตัวกรอง และ Pagination
 * อนุญาตเฉพาะผู้ดูแลระบบที่มีสิทธิ์ VIEW_AUDIT_LOGS
 */
export async function getAuditLogsAction(
  params: GetAuditLogsParams = {}
): Promise<AuditLogsResult> {
  try {
    const authCheck = await requireAdminPermission("VIEW_AUDIT_LOGS");
    if (!authCheck.ok) {
      return {
        success: false,
        message: authCheck.error,
        logs: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        stats: {
          totalLogs: 0,
          loginSuccessCount: 0,
          loginFailedCount: 0,
          actionsTodayCount: 0,
        },
      };
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(10, params.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const whereClause = buildWhereClause(params);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [logs, totalCount, totalLogs, loginSuccessCount, loginFailedCount, actionsTodayCount] =
      await Promise.all([
        prisma.auditLog.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
        prisma.auditLog.count({ where: whereClause }),
        prisma.auditLog.count(),
        prisma.auditLog.count({ where: { action: "LOGIN_SUCCESS" } }),
        prisma.auditLog.count({ where: { action: "LOGIN_FAILED" } }),
        prisma.auditLog.count({
          where: {
            createdAt: { gte: todayStart },
          },
        }),
      ]);

    const formattedLogs: AuditLogItem[] = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      username: log.username,
      role: log.role,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      success: true,
      logs: formattedLogs,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: page,
      stats: {
        totalLogs,
        loginSuccessCount,
        loginFailedCount,
        actionsTodayCount,
      },
    };
  } catch (error) {
    console.error("getAuditLogsAction error:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการโหลดบันทึกประวัติการใช้งาน",
      logs: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: 1,
      stats: {
        totalLogs: 0,
        loginSuccessCount: 0,
        loginFailedCount: 0,
        actionsTodayCount: 0,
      },
    };
  }
}

export interface ExportAuditLogsResult {
  success: boolean;
  message?: string;
  csvData?: string;
  filename?: string;
  totalRecords?: number;
}

/**
 * ส่งออก Audit Logs เป็น CSV พร้อม UTF-8 BOM สำหรับเปิดใน Excel
 */
export async function exportAuditLogsCsvAction(
  params: GetAuditLogsParams = {}
): Promise<ExportAuditLogsResult> {
  try {
    const authCheck = await requireAdminPermission("VIEW_AUDIT_LOGS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }

    const whereClause = buildWhereClause(params);

    // ดึงสูงสุด 10,000 แถวเพื่อประสิทธิภาพและความปลอดภัย
    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const headers = [
      "รหัสเหตุการณ์ (ID)",
      "วันเวลา (Timestamp)",
      "ผู้ใช้งาน (Username)",
      "บทบาท (Role)",
      "การกระทำ (Action)",
      "ประเภทเป้าหมาย (Target Type)",
      "รหัสเป้าหมาย (Target ID)",
      "IP Address",
      "User-Agent",
      "รายละเอียด (Details)",
    ];

    const escapeCsv = (val: string | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = logs.map((log) => [
      escapeCsv(log.id),
      escapeCsv(log.createdAt.toISOString()),
      escapeCsv(log.username || "ระบบ / ไม่ระบุ"),
      escapeCsv(log.role || "-"),
      escapeCsv(log.action),
      escapeCsv(log.targetType || "-"),
      escapeCsv(log.targetId || "-"),
      escapeCsv(log.ipAddress || "-"),
      escapeCsv(log.userAgent || "-"),
      escapeCsv(log.details || "-"),
    ]);

    const csvContent = [headers.map((h) => `"${h}"`).join(","), ...rows.map((r) => r.join(","))].join(
      "\r\n"
    );

    // เติม UTF-8 BOM (\uFEFF) เพื่อให้ Excel และซอฟต์แวร์ภาษาไทยแสดงผลถูกต้อง 100%
    const csvWithBom = "\uFEFF" + csvContent;
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `audit-logs-${dateStr}.csv`;

    return {
      success: true,
      csvData: csvWithBom,
      filename,
      totalRecords: logs.length,
    };
  } catch (error) {
    console.error("exportAuditLogsCsvAction error:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการส่งออกข้อมูลประวัติการใช้งาน",
    };
  }
}
