"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { AdminRoleType, AdminPermissionType, ROLE_DEFAULT_PERMISSIONS } from "@/lib/auth/permissions";
import { requireAdminPermission } from "@/lib/auth/permissions-server";
import { createAuditLog } from "@/lib/audit/logger";

const createUserSchema = z.object({
  username: z
    .string()
    .min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร")
    .max(30, "ชื่อผู้ใช้ต้องไม่เกิน 30 ตัวอักษร")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษรภาษาอังกฤษ ตัวเลข, '.', '_' หรือ '-' เท่านั้น"
    ),
  password: z
    .string()
    .min(6, "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),
  role: z.enum(["ADMIN", "STUDENT"]).default("ADMIN"),
  adminRole: z.enum(["SUPER_ADMIN", "TEACHER", "ASSISTANT", "CUSTOM"]).default("TEACHER"),
  permissions: z.array(z.string()).default([]),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร")
    .max(30, "ชื่อผู้ใช้ต้องไม่เกิน 30 ตัวอักษร")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษรภาษาอังกฤษ ตัวเลข, '.', '_' หรือ '-' เท่านั้น"
    ),
  role: z.enum(["ADMIN", "STUDENT"]),
  adminRole: z.enum(["SUPER_ADMIN", "TEACHER", "ASSISTANT", "CUSTOM"]).optional(),
  permissions: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export interface UserActionResult {
  success: boolean;
  message?: string;
  userId?: string;
}

/**
 * สร้างผู้ใช้งานใหม่ (โดยเฉพาะผู้ดูแลระบบ / ครู)
 */
export async function createUserAction(
  formData: FormData
): Promise<UserActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_USERS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }

    const { user: currentUser } = authCheck;

    const username = (formData.get("username") as string)?.trim();
    const password = (formData.get("password") as string) || "";
    const role = (formData.get("role") as "ADMIN" | "STUDENT") || "ADMIN";
    const adminRole = (formData.get("adminRole") as AdminRoleType) || "TEACHER";
    const permissionsRaw = formData.getAll("permissions") as string[];
    const status = (formData.get("status") as "ACTIVE" | "INACTIVE") || "ACTIVE";

    // ป้องกันไม่ให้แอดมินธรรมดาสร้าง Super Admin ได้
    if (adminRole === "SUPER_ADMIN" && currentUser.adminRole !== "SUPER_ADMIN") {
      return {
        success: false,
        message: "เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถสร้างบัญชี Super Admin ได้",
      };
    }

    // หากเป็น Role สำเร็จรูป ให้ใช้ชุด Permissions เริ่มต้น
    let finalPermissions: AdminPermissionType[] = [];
    if (role === "ADMIN") {
      if (adminRole === "CUSTOM") {
        finalPermissions = permissionsRaw as AdminPermissionType[];
      } else {
        finalPermissions = ROLE_DEFAULT_PERMISSIONS[adminRole] || [];
      }
    }

    const parsed = createUserSchema.safeParse({
      username,
      password,
      role,
      adminRole,
      permissions: finalPermissions,
      status,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง",
      };
    }

    // ตรวจสอบ username ซ้ำ
    const existing = await prisma.user.findUnique({
      where: { username: parsed.data.username },
    });

    if (existing) {
      return {
        success: false,
        message: `ชื่อผู้ใช้ "${parsed.data.username}" มีอยู่ในระบบแล้ว`,
      };
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const newUser = await prisma.user.create({
      data: {
        username: parsed.data.username,
        passwordHash,
        role: parsed.data.role,
        adminRole: parsed.data.role === "ADMIN" ? (parsed.data.adminRole as any) : null,
        permissions: parsed.data.role === "ADMIN" ? (finalPermissions as any) : [],
        status: parsed.data.status,
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "CREATE_USER",
      targetType: "USER",
      targetId: newUser.id,
      details: {
        newUsername: newUser.username,
        role: newUser.role,
        adminRole: newUser.adminRole,
        permissions: finalPermissions,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `สร้างบัญชีผู้ใช้งาน "${newUser.username}" (${parsed.data.adminRole}) เรียบร้อยแล้ว`,
      userId: newUser.id,
    };
  } catch (error) {
    console.error("createUserAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน" };
  }
}

/**
 * แก้ไขข้อมูลผู้ใช้งาน (username, role, adminRole, permissions, status)
 */
export async function updateUserAction(
  userId: string,
  formData: FormData
): Promise<UserActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_USERS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }

    const { user: currentUser, session } = authCheck;

    const username = (formData.get("username") as string)?.trim();
    const role = formData.get("role") as "ADMIN" | "STUDENT";
    const adminRole = formData.get("adminRole") as AdminRoleType | null;
    const permissionsRaw = formData.getAll("permissions") as string[];
    const status = formData.get("status") as "ACTIVE" | "INACTIVE";

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: "ไม่พบผู้ใช้งานนี้ในระบบ" };
    }

    // หากผู้ใช้ปัจจุบันไม่ใช่ SUPER_ADMIN ห้ามแก้ไขข้อมูลของ SUPER_ADMIN คนอื่น
    if (targetUser.adminRole === "SUPER_ADMIN" && currentUser.adminRole !== "SUPER_ADMIN") {
      return {
        success: false,
        message: "คุณไม่มีสิทธิ์แก้ไขข้อมูลของผู้ดูแลระบบสูงสุด (Super Admin)",
      };
    }

    // หากผู้ใช้ปัจจุบันไม่ใช่ SUPER_ADMIN ห้ามเลื่อนระดับใครเป็น SUPER_ADMIN
    if (adminRole === "SUPER_ADMIN" && currentUser.adminRole !== "SUPER_ADMIN") {
      return {
        success: false,
        message: "เฉพาะ Super Admin เท่านั้นที่สามารถมอบสิทธิ์ Super Admin ให้ผู้อื่นได้",
      };
    }

    // ห้ามแอดมินปลดสิทธิ์หรือระงับบัญชีของตนเอง
    if (session.userId === userId) {
      if (role !== "ADMIN") {
        return {
          success: false,
          message: "ไม่สามารถลดระดับสิทธิ์ของบัญชีที่คุณกำลังใช้งานอยู่ได้",
        };
      }
      if (status !== "ACTIVE") {
        return {
          success: false,
          message: "ไม่สามารถระงับการใช้งานบัญชีที่คุณกำลังใช้งานอยู่ได้",
        };
      }
    }

    // ตรวจสอบจำนวน Super Admin คนสุดท้าย
    if (targetUser.adminRole === "SUPER_ADMIN" && (role !== "ADMIN" || adminRole !== "SUPER_ADMIN" || status === "INACTIVE")) {
      const superAdminCount = await prisma.user.count({
        where: {
          role: "ADMIN",
          adminRole: "SUPER_ADMIN",
          status: "ACTIVE",
          id: { not: userId },
        },
      });

      if (superAdminCount === 0) {
        return {
          success: false,
          message: "ไม่สามารถเปลี่ยนแปลงหรือระงับสิทธิ์ Super Admin คนสุดท้ายของระบบได้",
        };
      }
    }

    // คำนวณ Permissions ตาม Admin Role
    let finalPermissions: AdminPermissionType[] = [];
    if (role === "ADMIN" && adminRole) {
      if (adminRole === "CUSTOM") {
        finalPermissions = permissionsRaw as AdminPermissionType[];
      } else {
        finalPermissions = ROLE_DEFAULT_PERMISSIONS[adminRole] || [];
      }
    }

    const parsed = updateUserSchema.safeParse({
      username,
      role,
      adminRole: adminRole || undefined,
      permissions: finalPermissions,
      status,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง",
      };
    }

    // ตรวจสอบ username ซ้ำกับคนอื่น
    if (parsed.data.username !== targetUser.username) {
      const existing = await prisma.user.findUnique({
        where: { username: parsed.data.username },
      });
      if (existing) {
        return {
          success: false,
          message: `ชื่อผู้ใช้ "${parsed.data.username}" ถูกใช้งานแล้ว`,
        };
      }
    }

    // อัปเดตข้อมูลผู้ใช้ พร้อมทั้งซิงก์ Student status ถ้ามี
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          username: parsed.data.username,
          role: parsed.data.role,
          adminRole: parsed.data.role === "ADMIN" ? (parsed.data.adminRole as any) : null,
          permissions: parsed.data.role === "ADMIN" ? (finalPermissions as any) : [],
          status: parsed.data.status,
        },
      });
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "UPDATE_USER_PERMISSIONS",
      targetType: "USER",
      targetId: userId,
      details: {
        targetUsername: parsed.data.username,
        oldRole: targetUser.adminRole,
        newRole: parsed.data.adminRole,
        permissions: finalPermissions,
        status: parsed.data.status,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/students");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `อัปเดตข้อมูลและสิทธิ์ผู้ใช้ "${parsed.data.username}" สำเร็จ`,
      userId,
    };
  } catch (error) {
    console.error("updateUserAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการอัปเดตผู้ใช้งาน" };
  }
}

/**
 * รีเซ็ตรหัสผ่านของผู้ใช้งานโดยแอดมิน
 */
export async function resetUserPasswordAction(
  userId: string,
  formData: FormData
): Promise<UserActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_USERS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }

    const { user: currentUser } = authCheck;

    const newPassword = (formData.get("newPassword") as string) || "";
    const confirmPassword = (formData.get("confirmPassword") as string) || "";

    const parsed = resetPasswordSchema.safeParse({
      newPassword,
      confirmPassword,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "ข้อมูลรหัสผ่านไม่ถูกต้อง",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: "ไม่พบผู้ใช้งานนี้ในระบบ" };
    }

    // แอดมินธรรมดาห้ามรีเซ็ตรหัสผ่านของ Super Admin
    if (targetUser.adminRole === "SUPER_ADMIN" && currentUser.adminRole !== "SUPER_ADMIN") {
      return {
        success: false,
        message: "เฉพาะ Super Admin เท่านั้นที่สามารถรีเซ็ตรหัสผ่านของ Super Admin ได้",
      };
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "RESET_PASSWORD",
      targetType: "USER",
      targetId: userId,
      details: `รีเซ็ตรหัสผ่านสำหรับบัญชี "${targetUser.username}"`,
    });

    revalidatePath("/admin/users");

    return {
      success: true,
      message: `รีเซ็ตรหัสผ่านสำหรับ "${targetUser.username}" สำเร็จ`,
      userId,
    };
  } catch (error) {
    console.error("resetUserPasswordAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน" };
  }
}

/**
 * สลับสถานะเปิดใช้งาน / ระงับการใช้งาน (ACTIVE / INACTIVE)
 */
export async function toggleUserStatusAction(
  userId: string,
  newStatus: "ACTIVE" | "INACTIVE"
): Promise<UserActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_USERS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }

    const { user: currentUser, session } = authCheck;

    if (session.userId === userId) {
      return {
        success: false,
        message: "ไม่สามารถระงับการใช้งานบัญชีของตนเองได้",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: "ไม่พบผู้ใช้งานนี้ในระบบ" };
    }

    if (targetUser.adminRole === "SUPER_ADMIN" && currentUser.adminRole !== "SUPER_ADMIN") {
      return {
        success: false,
        message: "คุณไม่มีสิทธิ์ระงับการใช้งานบัญชี Super Admin",
      };
    }

    // ถ้ากำลังจะระงับการใช้งาน ADMIN ตรวจสอบว่ายังมี active admin เหลืออยู่อีกไหม
    if (targetUser.role === "ADMIN" && newStatus === "INACTIVE") {
      const activeAdminsCount = await prisma.user.count({
        where: {
          role: "ADMIN",
          status: "ACTIVE",
          id: { not: userId },
        },
      });

      if (activeAdminsCount === 0) {
        return {
          success: false,
          message: "ไม่สามารถระงับการใช้งานผู้ดูแลระบบคนสุดท้ายที่กำลังเปิดใช้งานอยู่ได้",
        };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "TOGGLE_USER_STATUS",
      targetType: "USER",
      targetId: userId,
      details: `${newStatus === "ACTIVE" ? "เปิดใช้งาน" : "ระงับการใช้งาน"} บัญชี "${targetUser.username}"`,
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `${newStatus === "ACTIVE" ? "เปิดใช้งาน" : "ระงับการใช้งาน"} บัญชี "${targetUser.username}" สำเร็จ`,
      userId,
    };
  } catch (error) {
    console.error("toggleUserStatusAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ" };
  }
}

/**
 * ลบผู้ใช้งาน (พร้อมการตรวจสอบความปลอดภัยและความสัมพันธ์ข้อมูล)
 */
export async function deleteUserAction(
  userId: string
): Promise<UserActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_USERS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }

    const { user: currentUser, session } = authCheck;

    if (session.userId === userId) {
      return {
        success: false,
        message: "ไม่สามารถลบบัญชีของตนเองได้",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            createdAssignments: true,
            gradesGiven: true,
            createdAttendanceSessions: true,
          },
        },
      },
    });

    if (!targetUser) {
      return { success: false, message: "ไม่พบผู้ใช้งานนี้ในระบบ" };
    }

    if (targetUser.adminRole === "SUPER_ADMIN" && currentUser.adminRole !== "SUPER_ADMIN") {
      return {
        success: false,
        message: "คุณไม่มีสิทธิ์ลบบัญชี Super Admin",
      };
    }

    // หากเป็น ADMIN ต้องมี ADMIN อื่นเหลืออยู่
    if (targetUser.role === "ADMIN") {
      const totalAdmins = await prisma.user.count({
        where: { role: "ADMIN" },
      });

      if (totalAdmins <= 1) {
        return {
          success: false,
          message: "ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายของระบบได้",
        };
      }
    }

    // ตรวจสอบ Foreign Key Restrict
    const { createdAssignments, gradesGiven, createdAttendanceSessions } =
      targetUser._count;

    if (
      createdAssignments > 0 ||
      gradesGiven > 0 ||
      createdAttendanceSessions > 0
    ) {
      const reasons: string[] = [];
      if (createdAssignments > 0)
        reasons.push(`การบ้าน ${createdAssignments} รายการ`);
      if (gradesGiven > 0) reasons.push(`การตรวจงาน ${gradesGiven} รายการ`);
      if (createdAttendanceSessions > 0)
        reasons.push(`เช็กชื่อ ${createdAttendanceSessions} ครั้ง`);

      return {
        success: false,
        message: `ไม่สามารถลบผู้ใช้นี้ได้ เนื่องจากมีประวัติการทำรายการในระบบ (${reasons.join(
          ", "
        )}) กรุณาใช้การ 'ระงับการใช้งาน' แทน เพื่อรักษาประวัติข้อมูล`,
      };
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "DELETE_USER",
      targetType: "USER",
      targetId: userId,
      details: `ลบบัญชีผู้ใช้ "${targetUser.username}" (${targetUser.role})`,
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/students");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `ลบบัญชีผู้ใช้ "${targetUser.username}" เรียบร้อยแล้ว`,
      userId,
    };
  } catch (error) {
    console.error("deleteUserAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการลบผู้ใช้งาน" };
  }
}
