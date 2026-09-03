"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { getAuthSession } from "@/lib/auth/session";
import { hashPassword, comparePassword } from "@/lib/auth/password";

const studentProfileSchema = z.object({
  firstName: z.string().min(1, "กรุณากรอกชื่อจริง"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export interface ProfileActionResult {
  success: boolean;
  message?: string;
}

/**
 * Server Action สำหรับนักเรียนแก้ไขข้อมูลชื่อ-นามสกุลของตนเอง
 */
export async function updateStudentProfileSelfAction(
  formData: FormData
): Promise<ProfileActionResult> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "STUDENT" || !session.studentId) {
      return { success: false, message: "ไม่มีสิทธิ์ในการแก้ไขข้อมูลนี้" };
    }

    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();

    const parsed = studentProfileSchema.safeParse({ firstName, lastName });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง",
      };
    }

    await prisma.student.update({
      where: { id: session.studentId },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
      },
    });

    revalidatePath("/student/dashboard");
    revalidatePath("/student/profile");
    revalidatePath("/student/assignments");

    return {
      success: true,
      message: "อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว",
    };
  } catch (error) {
    console.error("updateStudentProfileSelfAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
  }
}

/**
 * Server Action สำหรับนักเรียนตั้งค่าหรือเปลี่ยนรหัสผ่าน
 */
export async function changeStudentPasswordAction(
  formData: FormData
): Promise<ProfileActionResult> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "STUDENT") {
      return { success: false, message: "ไม่มีสิทธิ์ในการเปลี่ยนรหัสผ่าน" };
    }

    const currentPassword = (formData.get("currentPassword") as string) || "";
    const newPassword = (formData.get("newPassword") as string) || "";
    const confirmPassword = (formData.get("confirmPassword") as string) || "";

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "ข้อมูลรหัสผ่านไม่ถูกต้อง",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return { success: false, message: "ไม่พบบัญชีผู้ใช้ในระบบ" };
    }

    // ถ้านักเรียนเคยมีรหัสผ่านเดิม ต้องตรวจสอบรหัสผ่านเดิมก่อน
    if (user.passwordHash) {
      if (!currentPassword) {
        return { success: false, message: "กรุณาระบุรหัสผ่านเดิมเพื่อความปลอดภัย" };
      }

      const isValid = await comparePassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return { success: false, message: "รหัสผ่านเดิมไม่ถูกต้อง" };
      }
    }

    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: newHash },
    });

    revalidatePath("/student/profile");

    return {
      success: true,
      message: "เปลี่ยนรหัสผ่านบัญชีสำเร็จเรียบร้อยแล้ว",
    };
  } catch (error) {
    console.error("changeStudentPasswordAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" };
  }
}

/**
 * Server Action สำหรับแอดมินเปลี่ยนรหัสผ่าน
 */
export async function changeAdminPasswordAction(
  formData: FormData
): Promise<ProfileActionResult> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "ไม่มีสิทธิ์ในการเปลี่ยนรหัสผ่าน" };
    }

    const currentPassword = (formData.get("currentPassword") as string) || "";
    const newPassword = (formData.get("newPassword") as string) || "";
    const confirmPassword = (formData.get("confirmPassword") as string) || "";

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "ข้อมูลรหัสผ่านไม่ถูกต้อง",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.passwordHash) {
      return { success: false, message: "ไม่พบบัญชีผู้ดูแลระบบ" };
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return { success: false, message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };
    }

    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: newHash },
    });

    revalidatePath("/admin/settings");

    return {
      success: true,
      message: "เปลี่ยนรหัสผ่านผู้ดูแลระบบสำเร็จเรียบร้อยแล้ว",
    };
  } catch (error) {
    console.error("changeAdminPasswordAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" };
  }
}
