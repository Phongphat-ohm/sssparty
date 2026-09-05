import { prisma } from "@/lib/prisma/client";
import { getAuthSession } from "@/lib/auth/session";
import {
  AdminPermissionType,
  ADMIN_PERMISSIONS_LIST,
  hasAdminPermission,
} from "./permissions";

export interface PermissionCheckResult {
  ok: boolean;
  error?: string;
  user?: any;
  session?: any;
}

/**
 * Helper ใช้ตรวจสอบสิทธิ์แบบเข้มงวดใน Server Actions (Server-only)
 * ดึงสถานะล่าสุดจากฐานข้อมูลเพื่อความปลอดภัยทันท่วงที (Real-time Enforcement)
 */
export async function requireAdminPermission(
  requiredPermission: AdminPermissionType
): Promise<PermissionCheckResult> {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN" || !session.userId) {
    return {
      ok: false,
      error: "ไม่มีสิทธิ์ในการดำเนินการนี้ (ต้องเป็นผู้ดูแลระบบที่เข้าสู่ระบบแล้วเท่านั้น)",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      role: true,
      adminRole: true,
      permissions: true,
      status: true,
    },
  });

  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") {
    return {
      ok: false,
      error: "บัญชีของคุณถูกระงับการใช้งานหรือไม่พบในระบบ",
    };
  }

  const hasPerm = hasAdminPermission(user, requiredPermission);
  if (!hasPerm) {
    const permDef = ADMIN_PERMISSIONS_LIST.find((p) => p.key === requiredPermission);
    const permName = permDef ? `"${permDef.label}"` : requiredPermission;
    return {
      ok: false,
      error: `คุณไม่มีสิทธิ์ในการดำเนินการนี้ (จำเป็นต้องมีสิทธิ์ ${permName})`,
    };
  }

  return {
    ok: true,
    user,
    session,
  };
}
