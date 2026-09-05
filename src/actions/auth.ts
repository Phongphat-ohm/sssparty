"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { comparePassword } from "@/lib/auth/password";
import { signAuthToken } from "@/lib/auth/jwt";
import { setAuthSession, getAuthSession, clearAuthSession } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/logger";
import { getSystemSettings } from "@/lib/settings/system-settings";

// Zod Validation Schemas
const adminLoginSchema = z.object({
  username: z.string().min(1, "กรุณากรอกชื่อผู้ใช้งาน"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

const studentLoginSchema = z.object({
  studentCode: z
    .string()
    .min(1, "กรุณากรอกรหัสนักเรียน")
    .regex(/^\d+$/, "รหัสนักเรียนต้องเป็นตัวเลขเท่านั้น"),
  className: z.string().min(1, "กรุณากรอกชั้นเรียน เช่น ม.4/1"),
  studentNumber: z
    .string()
    .min(1, "กรุณากรอกเลขที่")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, "เลขที่ต้องเป็นจำนวนเต็มบวก"),
});

export interface AuthActionResult {
  success: boolean;
  message?: string;
  redirectUrl?: string;
}

/**
 * Server Action สำหรับครู/ผู้ดูแลระบบเข้าสู่ระบบ
 */
export async function adminLoginAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  try {
    const rawData = {
      username: formData.get("username"),
      password: formData.get("password"),
    };

    const parsed = adminLoginSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง",
      };
    }

    const { username, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE" || !user.passwordHash) {
      await createAuditLog({
        username,
        role: "ADMIN",
        action: "LOGIN_FAILED",
        targetType: "AUTH",
        details: !user
          ? "ไม่พบบัญชีผู้ดูแลนี้ในระบบ"
          : user.status !== "ACTIVE"
          ? "บัญชีถูกระงับการใช้งาน"
          : "รหัสผ่านไม่ถูกต้อง หรือบัญชีไม่ใช่ระดับผู้ดูแล",
      });
      return {
        success: false,
        message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
      };
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      await createAuditLog({
        userId: user.id,
        username: user.username,
        role: "ADMIN",
        action: "LOGIN_FAILED",
        targetType: "AUTH",
        details: "รหัสผ่านไม่ถูกต้อง",
      });
      return {
        success: false,
        message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
      };
    }

    const token = await signAuthToken({
      userId: user.id,
      role: "ADMIN",
      username: user.username,
    });

    await setAuthSession(token);

    await createAuditLog({
      userId: user.id,
      username: user.username,
      role: "ADMIN",
      action: "LOGIN_SUCCESS",
      targetType: "AUTH",
      details: "เข้าสู่ระบบผู้ดูแลสำเร็จ",
    });

    return {
      success: true,
      redirectUrl: "/admin/dashboard",
    };
  } catch (err) {
    console.error("adminLoginAction error:", err);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง",
    };
  }
}

/**
 * Server Action สำหรับนักเรียนเข้าสู่ระบบด้วย รหัส/ห้อง/เลขที่
 */
export async function studentLoginAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  try {
    const rawData = {
      studentCode: formData.get("studentCode"),
      className: formData.get("className"),
      studentNumber: formData.get("studentNumber"),
    };

    const settings = await getSystemSettings();
    if (settings.maintenance_mode) {
      return {
        success: false,
        message: "ระบบกำลังปิดปรับปรุงชั่วคราว จึงไม่สามารถเข้าสู่ระบบได้ในขณะนี้",
        redirectUrl: "/maintenance",
      };
    }

    const parsed = studentLoginSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง",
      };
    }

    const { studentCode, className, studentNumber } = parsed.data;

    const student = await prisma.student.findUnique({
      where: { studentCode },
    });

    if (
      !student ||
      student.status !== "ACTIVE" ||
      student.className.trim() !== className.trim() ||
      student.studentNumber !== studentNumber
    ) {
      await createAuditLog({
        username: studentCode,
        role: "STUDENT",
        action: "LOGIN_FAILED",
        targetType: "AUTH",
        details: `พยายามเข้าสู่ระบบนักเรียนรหัส ${studentCode} (ห้อง ${className}, เลขที่ ${studentNumber}) ไม่สำเร็จ`,
      });
      return {
        success: false,
        message: "ไม่พบข้อมูลนักเรียน หรือข้อมูลชั้น/เลขที่ไม่ตรงกับในระบบ",
      };
    }

    const token = await signAuthToken({
      userId: student.id,
      role: "STUDENT",
      username: student.studentCode,
      studentId: student.id,
      studentCode: student.studentCode,
      name: `${student.firstName} ${student.lastName}`,
      className: student.className,
      studentNumber: student.studentNumber,
    });

    await setAuthSession(token);

    await createAuditLog({
      username: student.studentCode,
      role: "STUDENT",
      action: "LOGIN_SUCCESS",
      targetType: "AUTH",
      targetId: student.id,
      details: `นักเรียนเข้าสู่ระบบสำเร็จ: ${student.firstName} ${student.lastName} (ห้อง ${student.className} เลขที่ ${student.studentNumber})`,
    });

    return {
      success: true,
      redirectUrl: "/student/dashboard",
    };
  } catch (err) {
    console.error("studentLoginAction error:", err);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง",
    };
  }
}

/**
 * Server Action สำหรับออกจากระบบ (Logout)
 */
export async function logoutAction(): Promise<void> {
  try {
    const session = await getAuthSession();
    if (session) {
      await createAuditLog({
        userId: session.role === "ADMIN" ? session.userId : null,
        username: session.username,
        role: session.role,
        action: "LOGOUT",
        targetType: "AUTH",
        details: "ออกจากระบบ",
      });
    }
  } catch (err) {
    console.error("logoutAction log error:", err);
  }
  await clearAuthSession();
}

