"use server";

import { prisma } from "@/lib/prisma/client";
import { requireAdminPermission } from "@/lib/auth/permissions-server";

export interface GetAuditLogsParams {
  page?: number;
  pageSize?: number;
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

    const whereClause: any = {};

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
