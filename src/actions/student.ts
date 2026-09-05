"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requireAdminPermission } from "@/lib/auth/permissions-server";
import { createAuditLog } from "@/lib/audit/logger";

const studentSchema = z.object({
  studentCode: z
    .string()
    .min(3, "รหัสนักเรียนต้องมีอย่างน้อย 3 ตัวอักษร")
    .max(10, "รหัสนักเรียนต้องไม่เกิน 10 ตัวอักษร"),
  firstName: z.string().min(1, "กรุณากรอกชื่อจริง"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
  className: z.string().min(1, "กรุณาระบุชั้นเรียน เช่น ม.4/1"),
  studentNumber: z.number().int().positive("เลขที่ต้องเป็นจำนวนเต็มบวก"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export interface StudentActionResult {
  success: boolean;
  message?: string;
  studentId?: string;
}

/**
 * Server Action สำหรับครูเพิ่มนักเรียนใหม่เข้าสู่ชุมนุม
 */
export async function createStudentAction(
  formData: FormData
): Promise<StudentActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_STUDENTS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const studentCode = (formData.get("studentCode") as string)?.trim();
    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const className = (formData.get("className") as string)?.trim();
    const studentNumber = parseInt(formData.get("studentNumber") as string, 10);
    const status = (formData.get("status") as "ACTIVE" | "INACTIVE") || "ACTIVE";

    const parsed = studentSchema.safeParse({
      studentCode,
      firstName,
      lastName,
      className,
      studentNumber,
      status,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "ข้อมูลนักเรียนไม่ถูกต้อง",
      };
    }

    // 1. ตรวจสอบรหัสนักเรียนซ้ำในตาราง student
    const existingCode = await prisma.student.findUnique({
      where: { studentCode },
    });
    if (existingCode) {
      return { success: false, message: `รหัสนักเรียน "${studentCode}" มีอยู่ในระบบแล้ว` };
    }

    // 2. ตรวจสอบเลขที่ซ้ำในห้องเดียวกันตาม Constraint @@unique([className, studentNumber])
    const existingNumber = await prisma.student.findUnique({
      where: {
        className_studentNumber: {
          className,
          studentNumber,
        },
      },
    });
    if (existingNumber) {
      return {
        success: false,
        message: `ห้อง ${className} มีเลขที่ ${studentNumber} อยู่แล้ว (${existingNumber.firstName} ${existingNumber.lastName})`,
      };
    }

    // 3. สร้าง Student ในตาราง students
    const newStudent = await prisma.student.create({
      data: {
        studentCode: parsed.data.studentCode,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        className: parsed.data.className,
        studentNumber: parsed.data.studentNumber,
        status: parsed.data.status,
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "CREATE_STUDENT",
      targetType: "STUDENT",
      targetId: newStudent.id,
      details: `เพิ่มนักเรียนใหม่: ${newStudent.firstName} ${newStudent.lastName} (รหัส: ${newStudent.studentCode}, ห้อง ${newStudent.className} เลขที่ ${newStudent.studentNumber})`,
    });

    revalidatePath("/admin/students");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `เพิ่มนักเรียน ${newStudent.firstName} ${newStudent.lastName} เข้าสู่ชุมนุมเรียบร้อยแล้ว`,
      studentId: newStudent.id,
    };
  } catch (error) {
    console.error("createStudentAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการเพิ่มนักเรียน" };
  }
}

/**
 * Server Action สำหรับแก้ไขข้อมูลนักเรียน
 */
export async function updateStudentAction(
  studentId: string,
  formData: FormData
): Promise<StudentActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_STUDENTS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const studentCode = (formData.get("studentCode") as string)?.trim();
    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const className = (formData.get("className") as string)?.trim();
    const studentNumber = parseInt(formData.get("studentNumber") as string, 10);
    const status = (formData.get("status") as "ACTIVE" | "INACTIVE") || "ACTIVE";

    const parsed = studentSchema.safeParse({
      studentCode,
      firstName,
      lastName,
      className,
      studentNumber,
      status,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "ข้อมูลนักเรียนไม่ถูกต้อง",
      };
    }

    // ตรวจสอบรหัสซ้ำกับคนอื่น
    const existingCode = await prisma.student.findFirst({
      where: { studentCode, id: { not: studentId } },
    });
    if (existingCode) {
      return { success: false, message: `รหัสนักเรียน "${studentCode}" ซ้ำกับนักเรียนคนอื่น` };
    }

    // ตรวจสอบห้อง/เลขที่ซ้ำกับคนอื่น
    const existingNumber = await prisma.student.findFirst({
      where: {
        className,
        studentNumber,
        id: { not: studentId },
      },
    });
    if (existingNumber) {
      return {
        success: false,
        message: `ห้อง ${className} มีเลขที่ ${studentNumber} ซ้ำกับนักเรียนคนอื่น`,
      };
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        studentCode: parsed.data.studentCode,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        className: parsed.data.className,
        studentNumber: parsed.data.studentNumber,
        status: parsed.data.status,
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "UPDATE_STUDENT",
      targetType: "STUDENT",
      targetId: studentId,
      details: `แก้ไขข้อมูลนักเรียน: ${updated.firstName} ${updated.lastName} (รหัส: ${updated.studentCode}, ห้อง ${updated.className} เลขที่ ${updated.studentNumber}, สถานะ: ${updated.status})`,
    });

    revalidatePath("/admin/students");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: "อัปเดตข้อมูลนักเรียนเรียบร้อยแล้ว",
      studentId,
    };
  } catch (error) {
    console.error("updateStudentAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูลนักเรียน" };
  }
}

/**
 * Server Action สลับสถานะนักเรียน (ACTIVE / INACTIVE)
 */
export async function toggleStudentStatusAction(
  studentId: string,
  newStatus: "ACTIVE" | "INACTIVE"
): Promise<StudentActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_STUDENTS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        status: newStatus,
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "UPDATE_STUDENT",
      targetType: "STUDENT",
      targetId: studentId,
      details: `เปลี่ยนสถานะนักเรียน ${updated.firstName} ${updated.lastName} (${updated.studentCode}) เป็น ${newStatus}`,
    });

    revalidatePath("/admin/students");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `เปลี่ยนสถานะนักเรียนเป็น ${newStatus === "ACTIVE" ? "ปกติ" : "ระงับการใช้งาน"} สำเร็จ`,
    };
  } catch (error) {
    console.error("toggleStudentStatusAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ" };
  }
}

export interface BatchImportStudentItem {
  studentCode: string;
  firstName: string;
  lastName: string;
  className: string;
  studentNumber: number;
}

export interface BatchImportResult {
  success: boolean;
  message?: string;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
}

/**
 * Server Action สำหรับนำเข้าข้อมูลนักเรียนแบบกลุ่ม (Batch Import from CSV)
 */
export async function importStudentsAction(
  students: BatchImportStudentItem[]
): Promise<BatchImportResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_STUDENTS");
    if (!authCheck.ok) {
      return {
        success: false,
        message: authCheck.error,
        importedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errors: ["Unauthorized"],
      };
    }
    const { user: currentUser } = authCheck;

    if (!students || students.length === 0) {
      return {
        success: false,
        message: "ไม่พบข้อมูลนักเรียนที่ต้องการนำเข้า",
        importedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errors: [],
      };
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const item of students) {
      const studentCode = item.studentCode.trim();
      const firstName = item.firstName.trim();
      const lastName = item.lastName.trim();
      const className = item.className.trim();
      const studentNumber = item.studentNumber;

      if (!studentCode || !firstName || !lastName || !className || !studentNumber) {
        skippedCount++;
        errors.push(`ข้อมูลไม่ครบถ้วน: ${studentCode} ${firstName}`);
        continue;
      }

      try {
        // ตรวจสอบว่ามีนักเรียนรหัสนี้อยู่แล้วหรือไม่
        const existingStudent = await prisma.student.findUnique({
          where: { studentCode },
        });

        if (existingStudent) {
          // ตรวจสอบห้องและเลขที่ว่าชนกับคนอื่นหรือไม่
          const conflict = await prisma.student.findFirst({
            where: {
              className,
              studentNumber,
              id: { not: existingStudent.id },
            },
          });

          if (conflict) {
            skippedCount++;
            errors.push(
              `รหัส ${studentCode}: ห้อง ${className} เลขที่ ${studentNumber} ซ้ำกับ ${conflict.firstName} ${conflict.lastName}`
            );
            continue;
          }

          // อัปเดตข้อมูล
          await prisma.student.update({
            where: { id: existingStudent.id },
            data: {
              firstName,
              lastName,
              className,
              studentNumber,
            },
          });
          updatedCount++;
        } else {
          // ตรวจสอบว่าห้อง/เลขที่ซ้ำกับคนอื่นหรือไม่
          const conflict = await prisma.student.findUnique({
            where: {
              className_studentNumber: {
                className,
                studentNumber,
              },
            },
          });

          if (conflict) {
            skippedCount++;
            errors.push(
              `รหัส ${studentCode}: ห้อง ${className} เลขที่ ${studentNumber} ซ้ำกับ ${conflict.firstName} ${conflict.lastName}`
            );
            continue;
          }

          // สร้างใหม่ในตาราง students
          await prisma.student.create({
            data: {
              studentCode,
              firstName,
              lastName,
              className,
              studentNumber,
              status: "ACTIVE",
            },
          });
          importedCount++;
        }
      } catch (err: any) {
        console.error(`Import student ${studentCode} error:`, err);
        skippedCount++;
        errors.push(`รหัส ${studentCode}: ${err.message || "เกิดข้อผิดพลาด"}`);
      }
    }

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "IMPORT_STUDENTS_CSV",
      targetType: "STUDENT",
      details: `นำเข้าข้อมูลนักเรียนผ่าน CSV: เพิ่มใหม่ ${importedCount} คน, อัปเดต ${updatedCount} คน, ข้าม ${skippedCount} คน`,
    });

    revalidatePath("/admin/students");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `นำเข้าข้อมูลเสร็จสิ้น: เพิ่มใหม่ ${importedCount} คน, อัปเดต ${updatedCount} คน, ข้าม ${skippedCount} คน`,
      importedCount,
      updatedCount,
      skippedCount,
      errors,
    };
  } catch (error) {
    console.error("importStudentsAction error:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการประมวลผลข้อมูล",
      importedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: ["System error"],
    };
  }
}
