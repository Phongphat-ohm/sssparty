"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { getAuthSession } from "@/lib/auth/session";
import { requireAdminPermission } from "@/lib/auth/permissions-server";
import { createAuditLog } from "@/lib/audit/logger";
import { invalidateSettingsCache } from "@/lib/settings/system-settings";
import { comparePassword } from "@/lib/auth/password";
import { s3Client, S3_BUCKET } from "@/lib/s3/client";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import {
  ADMIN_TERM_COOKIE_NAME,
  getCurrentSystemTerm,
  getAllAcademicTermsWithStats,
  AcademicTermWithStats,
} from "@/lib/terms/term-service";

export interface TermActionResult {
  success: boolean;
  message?: string;
  data?: any;
}

/**
 * สลับเทอมการทำงานของ Admin/ครู ผ่าน Cookie
 * ห้ามลงทะเบียนเทอมอัตโนมัติ ต้องเป็นเทอมที่มีอยู่ในตาราง academic_terms เท่านั้น
 */
export async function switchAdminTermAction(newTerm: string): Promise<TermActionResult> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบ" };
    }

    const trimmedTerm = newTerm.trim();
    if (!trimmedTerm) {
      return { success: false, message: "กรุณาระบุภาคเรียนที่ถูกต้อง" };
    }

    // ต้องเป็นเทอมที่มีอยู่ในฐานข้อมูลเท่านั้น ห้ามสร้างอัตโนมัติ
    const existing = await prisma.academicTerm.findUnique({
      where: { termCode: trimmedTerm },
    });

    if (!existing) {
      return {
        success: false,
        message: `ไม่พบภาคเรียน "${trimmedTerm}" ในระบบ ต้องสร้างภาคเรียนผ่านหน้าจัดการภาคเรียนก่อนเท่านั้น`,
      };
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_TERM_COOKIE_NAME, trimmedTerm, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return { success: true };
  } catch (error: any) {
    console.error("[TermAction] Error switching term:", error);
    return { success: false, message: error?.message || "ไม่สามารถเปลี่ยนภาคเรียนได้" };
  }
}

/**
 * รีเซ็ตกลับไปเป็นเทอมปัจจุบันของระบบ
 */
export async function resetAdminTermAction(): Promise<TermActionResult> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบ" };
    }

    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_TERM_COOKIE_NAME);

    return { success: true };
  } catch (error: any) {
    console.error("[TermAction] Error resetting term:", error);
    return { success: false, message: error?.message || "ไม่สามารถรีเซ็ตภาคเรียนได้" };
  }
}

/**
 * ดึงรายการภาคเรียนทั้งหมดพร้อมสถิติ
 */
export async function getAcademicTermsWithStatsAction(): Promise<{
  success: boolean;
  terms: AcademicTermWithStats[];
  message?: string;
}> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, terms: [], message: "ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบ" };
    }

    const terms = await getAllAcademicTermsWithStats();
    return { success: true, terms };
  } catch (error: any) {
    console.error("[TermAction] Error getting terms with stats:", error);
    return { success: false, terms: [], message: "ไม่สามารถดึงข้อมูลภาคเรียนได้" };
  }
}

/**
 * สร้างภาคเรียนใหม่ (เฉพาะผู้มีสิทธิ์ MANAGE_SETTINGS หรือ SUPER_ADMIN)
 */
export async function createAcademicTermAction(formData: FormData): Promise<TermActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_SETTINGS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const termCode = (formData.get("termCode") as string)?.trim();
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const isCurrent = formData.get("isCurrent") === "true";
    const isLocked = formData.get("isLocked") === "true";

    if (!termCode) {
      return { success: false, message: "กรุณาระบุรหัสภาคเรียน เช่น 1/2569" };
    }

    if (!name) {
      return { success: false, message: "กรุณาระบุชื่อภาคเรียน เช่น ภาคเรียนที่ 1 ปีการศึกษา 2569" };
    }

    // ตรวจสอบว่ารหัสเทอมนี้มีอยู่แล้วหรือไม่
    const existing = await prisma.academicTerm.findUnique({
      where: { termCode },
    });

    if (existing) {
      return { success: false, message: `ภาคเรียนรหัส "${termCode}" มีอยู่ในระบบแล้ว` };
    }

    await prisma.$transaction(async (tx) => {
      // หากกำหนดให้เป็นเทอมปัจจุบัน ให้ปลดสถานะเทอมอื่นออกก่อน
      if (isCurrent) {
        await tx.academicTerm.updateMany({
          data: { isCurrent: false },
        });

        await tx.systemSetting.upsert({
          where: { key: "academic_term" },
          update: { value: termCode, updatedBy: currentUser.username },
          create: {
            key: "academic_term",
            value: termCode,
            category: "GENERAL",
            description: "ภาคเรียนปัจจุบันของระบบ",
            updatedBy: currentUser.username,
          },
        });
      }

      await tx.academicTerm.create({
        data: {
          termCode,
          name,
          description,
          isCurrent,
          isLocked,
        },
      });
    });

    if (isCurrent) {
      invalidateSettingsCache();
    }

    await createAuditLog({
      action: "UPDATE_SETTINGS",
      targetType: "SETTINGS",
      targetId: termCode,
      details: `สร้างภาคเรียนใหม่: ${name} (${termCode}), isCurrent: ${isCurrent}, isLocked: ${isLocked}`,
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
    });

    revalidatePath("/admin/terms");
    revalidatePath("/admin", "layout");
    return { success: true, message: `สร้างภาคเรียน ${termCode} เรียบร้อยแล้ว` };
  } catch (error: any) {
    console.error("[TermAction] Error creating academic term:", error);
    return { success: false, message: error?.message || "เกิดข้อผิดพลาดในการสร้างภาคเรียน" };
  }
}

/**
 * แก้ไขข้อมูลภาคเรียน (ชื่อ, รายละเอียด, สถานะล็อก)
 */
export async function updateAcademicTermAction(
  id: string,
  formData: FormData
): Promise<TermActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_SETTINGS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const isLocked = formData.get("isLocked") === "true";

    if (!name) {
      return { success: false, message: "กรุณาระบุชื่อภาคเรียน" };
    }

    const term = await prisma.academicTerm.findUnique({
      where: { id },
    });

    if (!term) {
      return { success: false, message: "ไม่พบข้อมูลภาคเรียนที่ต้องการแก้ไข" };
    }

    await prisma.academicTerm.update({
      where: { id },
      data: {
        name,
        description,
        isLocked,
      },
    });

    await createAuditLog({
      action: "UPDATE_SETTINGS",
      targetType: "SETTINGS",
      targetId: term.termCode,
      details: `แก้ไขภาคเรียน ${term.termCode}: name: ${name}, isLocked: ${isLocked}`,
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
    });

    revalidatePath("/admin/terms");
    revalidatePath("/admin", "layout");
    return { success: true, message: `อัปเดตภาคเรียน ${term.termCode} สำเร็จ` };
  } catch (error: any) {
    console.error("[TermAction] Error updating academic term:", error);
    return { success: false, message: error?.message || "เกิดข้อผิดพลาดในการอัปเดตภาคเรียน" };
  }
}

/**
 * สลับสถานะล็อก/ปลดล็อกภาคเรียน (Term Lock Toggle)
 */
export async function toggleTermLockAction(
  id: string,
  targetLockedState: boolean
): Promise<TermActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_SETTINGS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const term = await prisma.academicTerm.findUnique({
      where: { id },
    });

    if (!term) {
      return { success: false, message: "ไม่พบข้อมูลภาคเรียน" };
    }

    await prisma.academicTerm.update({
      where: { id },
      data: { isLocked: targetLockedState },
    });

    await createAuditLog({
      action: "UPDATE_SETTINGS",
      targetType: "SETTINGS",
      targetId: term.termCode,
      details: `${targetLockedState ? "ล็อก" : "ปลดล็อก"}ภาคเรียน ${term.termCode}`,
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
    });

    revalidatePath("/admin/terms");
    revalidatePath("/admin", "layout");
    return {
      success: true,
      message: `${targetLockedState ? "ล็อก" : "ปลดล็อก"}ภาคเรียน ${term.termCode} เรียบร้อยแล้ว`,
    };
  } catch (error: any) {
    console.error("[TermAction] Error toggling term lock:", error);
    return { success: false, message: error?.message || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะล็อก" };
  }
}

/**
 * กำหนดให้ภาคเรียนนี้เป็นเทอมปัจจุบันของระบบส่วนกลาง
 */
export async function setSystemActiveTermAction(id: string): Promise<TermActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_SETTINGS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const term = await prisma.academicTerm.findUnique({
      where: { id },
    });

    if (!term) {
      return { success: false, message: "ไม่พบข้อมูลภาคเรียน" };
    }

    await prisma.$transaction(async (tx) => {
      // ตั้งค่าทุกเทอมให้ไม่เป็น Current
      await tx.academicTerm.updateMany({
        data: { isCurrent: false },
      });

      // ตั้งเทอมนี้เป็น Current
      await tx.academicTerm.update({
        where: { id },
        data: { isCurrent: true },
      });

      // อัปเดตใน SystemSetting
      await tx.systemSetting.upsert({
        where: { key: "academic_term" },
        update: { value: term.termCode, updatedBy: currentUser.username },
        create: {
          key: "academic_term",
          value: term.termCode,
          category: "GENERAL",
          description: "ภาคเรียนปัจจุบันของระบบ",
          updatedBy: currentUser.username,
        },
      });
    });

    invalidateSettingsCache();

    await createAuditLog({
      action: "UPDATE_SETTINGS",
      targetType: "SETTINGS",
      targetId: term.termCode,
      details: `กำหนดให้ภาคเรียน ${term.termCode} เป็นภาคเรียนปัจจุบันของระบบส่วนกลาง`,
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
    });

    revalidatePath("/admin/terms");
    revalidatePath("/admin", "layout");
    revalidatePath("/student/dashboard");
    return {
      success: true,
      message: `กำหนดให้ภาคเรียน ${term.termCode} เป็นภาคเรียนปัจจุบันของระบบแล้ว`,
    };
  } catch (error: any) {
    console.error("[TermAction] Error setting active term:", error);
    return { success: false, message: error?.message || "เกิดข้อผิดพลาดในการเปลี่ยนเทอมปัจจุบัน" };
  }
}

/**
 * ลบภาคเรียน พร้อมระบบรักษาความปลอดภัยยืนยันรหัสผ่านแอดมิน และลบข้อมูลที่เกี่ยวเนื่องทั้งหมด (Cascade Deletion)
 */
export async function deleteAcademicTermAction(
  id: string,
  confirmTermCode: string,
  adminPassword: string
): Promise<TermActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_SETTINGS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    if (!adminPassword || !adminPassword.trim()) {
      return { success: false, message: "กรุณาระบุรหัสผ่านบัญชีผู้ดูแลระบบเพื่อยืนยันการลบ" };
    }

    // 1. ค้นหาข้อมูลภาคเรียนที่ต้องการลบ
    const term = await prisma.academicTerm.findUnique({
      where: { id },
    });

    if (!term) {
      return { success: false, message: "ไม่พบข้อมูลภาคเรียนที่ต้องการลบ" };
    }

    // 2. ป้องกันเด็ดขาด: ห้ามลบเทอมหลักของระบบ
    if (term.isCurrent) {
      return {
        success: false,
        message: "ไม่สามารถลบภาคเรียนที่เป็นเทอมปัจจุบันของระบบได้ กรุณาสลับเทอมอื่นเป็นเทอมปัจจุบันก่อน",
      };
    }

    // 3. ตรวจสอบรหัสยืนยันภาคเรียนให้ตรงกัน
    if (confirmTermCode.trim() !== term.termCode) {
      return {
        success: false,
        message: `รหัสภาคเรียนที่พิมพ์ยืนยันไม่ตรงกัน (ต้องพิมพ์ "${term.termCode}")`,
      };
    }

    // 4. ตรวจสอบรหัสผ่านบัญชีแอดมินของผู้ทำรายการ
    if (!currentUser.passwordHash) {
      return {
        success: false,
        message: "บัญชีผู้ใช้นี้ไม่มีรหัสผ่านที่ตั้งไว้ในระบบ ไม่สามารถดำเนินการได้",
      };
    }

    const isPasswordValid = await comparePassword(adminPassword.trim(), currentUser.passwordHash);
    if (!isPasswordValid) {
      return {
        success: false,
        message: "รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง ไม่สามารถดำเนินการลบได้",
      };
    }

    // 5. ดำเนินการ Safe Cascade Deletion ภายใน Transaction
    let deletedStats = {
      assignmentsCount: 0,
      submissionsCount: 0,
      sessionsCount: 0,
      recordsCount: 0,
      reportsCount: 0,
    };
    const s3KeysToDelete: string[] = [];

    await prisma.$transaction(async (tx) => {
      // 5.1 ค้นหาการบ้านทั้งหมดในเทอมนี้
      const assignments = await tx.assignment.findMany({
        where: { academicTerm: term.termCode },
        select: {
          id: true,
          attachments: { select: { fileKey: true } },
          submissions: {
            select: {
              id: true,
              fileKey: true,
              grade: { select: { id: true } },
            },
          },
        },
      });

      const assignmentIds = assignments.map((a) => a.id);
      const submissionIds = assignments.flatMap((a) => a.submissions.map((s) => s.id));
      const gradeIds = assignments.flatMap((a) =>
        a.submissions.map((s) => s.grade?.id).filter((gId): gId is string => Boolean(gId))
      );

      // รวบรวมคีย์ไฟล์บน S3
      for (const a of assignments) {
        for (const att of a.attachments) {
          if (att.fileKey) s3KeysToDelete.push(att.fileKey);
        }
        for (const sub of a.submissions) {
          if (sub.fileKey) s3KeysToDelete.push(sub.fileKey);
        }
      }

      // ลบ Rubric Scores
      if (gradeIds.length > 0) {
        await tx.rubricScore.deleteMany({
          where: { gradeId: { in: gradeIds } },
        });
      }

      // ลบ Grades และ Question Answers
      if (submissionIds.length > 0) {
        await tx.grade.deleteMany({
          where: { submissionId: { in: submissionIds } },
        });
        await tx.questionAnswer.deleteMany({
          where: { submissionId: { in: submissionIds } },
        });
      }

      // ลบ Submissions, Attachments, Questions, Rubrics และ Assignments
      if (assignmentIds.length > 0) {
        await tx.submission.deleteMany({
          where: { assignmentId: { in: assignmentIds } },
        });
        await tx.assignmentAttachment.deleteMany({
          where: { assignmentId: { in: assignmentIds } },
        });
        await tx.assignmentQuestion.deleteMany({
          where: { assignmentId: { in: assignmentIds } },
        });
        await tx.assignmentRubric.deleteMany({
          where: { assignmentId: { in: assignmentIds } },
        });
        await tx.assignment.deleteMany({
          where: { id: { in: assignmentIds } },
        });
      }

      // 5.2 ค้นหาและลบรอบการเช็กชื่อและประวัติทั้งหมด
      const sessions = await tx.attendanceSession.findMany({
        where: { academicTerm: term.termCode },
        select: { id: true },
      });
      const sessionIds = sessions.map((s) => s.id);
      if (sessionIds.length > 0) {
        const recordsCountRes = await tx.attendanceRecord.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
        deletedStats.recordsCount = recordsCountRes.count;
        await tx.attendanceSession.deleteMany({
          where: { id: { in: sessionIds } },
        });
      }

      // 5.3 ค้นหาและลบรายงานทางการที่เคยออก
      const reports = await tx.generatedReport.findMany({
        where: { academicTerm: term.termCode },
        select: { id: true, fileKey: true },
      });
      for (const rep of reports) {
        if (rep.fileKey) s3KeysToDelete.push(rep.fileKey);
      }
      if (reports.length > 0) {
        await tx.generatedReport.deleteMany({
          where: { academicTerm: term.termCode },
        });
      }

      // 5.4 ลบข้อมูลภาคเรียน
      await tx.academicTerm.delete({
        where: { id },
      });

      deletedStats.assignmentsCount = assignmentIds.length;
      deletedStats.submissionsCount = submissionIds.length;
      deletedStats.sessionsCount = sessionIds.length;
      deletedStats.reportsCount = reports.length;
    });

    // 6. ลบไฟล์จริงบน Cloud S3 (ถ้ามี) แบบแยกต่างหาก ไม่ให้บล็อกการทำงานหลัก
    if (s3KeysToDelete.length > 0 && process.env.S3_BUCKET) {
      try {
        const chunkSize = 500;
        for (let i = 0; i < s3KeysToDelete.length; i += chunkSize) {
          const chunk = s3KeysToDelete.slice(i, i + chunkSize);
          await s3Client.send(
            new DeleteObjectsCommand({
              Bucket: S3_BUCKET,
              Delete: {
                Objects: chunk.map((k) => ({ Key: k })),
                Quiet: true,
              },
            })
          );
        }
      } catch (s3Error) {
        console.warn("[TermAction] Warning deleting S3 files for term:", s3Error);
      }
    }

    // 7. เคลียร์คุกกี้ที่กำลังชี้ไปยังเทอมนี้ออก
    const cookieStore = await cookies();
    const activeSelectedTerm = cookieStore.get(ADMIN_TERM_COOKIE_NAME)?.value;
    if (activeSelectedTerm === term.termCode) {
      cookieStore.delete(ADMIN_TERM_COOKIE_NAME);
    }

    // 8. บันทึก Audit Log
    await createAuditLog({
      action: "DELETE_TERM",
      targetType: "SETTINGS",
      targetId: term.termCode,
      details: `ลบภาคเรียน "${term.termCode}" (${term.name}) และข้อมูลที่เกี่ยวเนื่องทั้งหมด (${deletedStats.assignmentsCount} การบ้าน, ${deletedStats.submissionsCount} งานที่ส่ง, ${deletedStats.sessionsCount} รอบเช็กชื่อ, ${deletedStats.recordsCount} บันทึกเวลาเรียน, ${deletedStats.reportsCount} รายงานทางการ) โดยยืนยันรหัสผ่านแอดมิน`,
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
    });

    revalidatePath("/admin/terms");
    revalidatePath("/admin", "layout");
    return {
      success: true,
      message: `ลบภาคเรียน ${term.termCode} พร้อมข้อมูลที่เกี่ยวข้องทั้งหมดเรียบร้อยแล้ว`,
    };
  } catch (error: any) {
    console.error("[TermAction] Error deleting academic term:", error);
    return { success: false, message: error?.message || "เกิดข้อผิดพลาดในการลบภาคเรียน" };
  }
}

/**
 * ดึงรายการภาคเรียนทั้งหมดพร้อมสถิติ (สำหรับ Client Component รีเฟรชข้อมูลตารางทันทีหลังแก้ไข)
 */
export async function getAcademicTermsListAction(): Promise<TermActionResult> {
  try {
    const terms = await getAllAcademicTermsWithStats();
    return { success: true, data: terms };
  } catch (error: any) {
    console.error("[TermAction] Error fetching academic terms list:", error);
    return { success: false, message: error?.message || "ไม่สามารถดึงข้อมูลภาคเรียนได้" };
  }
}

