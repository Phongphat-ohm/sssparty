"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requireAdminPermission } from "@/lib/auth/permissions-server";
import { createAuditLog } from "@/lib/audit/logger";
import { getSystemSetting } from "@/lib/settings/system-settings";
import { attendanceEventBus } from "@/lib/attendance/attendance-events";

export type AttendanceStatusType = "PRESENT" | "LATE" | "LEAVE" | "ABSENT";

const createSessionSchema = z.object({
  title: z.string().optional(),
  date: z.date(),
  academicTerm: z.string().default("1/2569"),
  note: z.string().optional(),
});

export interface AttendanceActionResult {
  success: boolean;
  message?: string;
  sessionId?: string;
}

/**
 * ฟังก์ชันช่วยสร้างชื่อรอบการเช็กชื่ออัตโนมัติ (เช่น กิจกรรมชุมนุม ครั้งที่ 1 (3 ก.ย. 2569))
 */
async function generateAutoSessionTitle(date: Date, academicTerm: string): Promise<string> {
  const count = await prisma.attendanceSession.count({
    where: { academicTerm },
  });
  const thaiDate = date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `กิจกรรมชุมนุม ครั้งที่ ${count + 1} (${thaiDate})`;
}

/**
 * Server Action สำหรับครูสร้างรอบการเช็กชื่อใหม่ (พร้อมสร้าง Record ให้สมาชิกทุกคนในชุมนุม)
 */
export async function createAttendanceSessionAction(
  formData: FormData
): Promise<AttendanceActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_ATTENDANCE");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const rawTitle = (formData.get("title") as string)?.trim();
    const dateStr = formData.get("date") as string;
    const defaultTerm = await getSystemSetting("academic_term");
    const academicTerm = (formData.get("academicTerm") as string)?.trim() || defaultTerm || "1/2569";
    const note = (formData.get("note") as string)?.trim() || undefined;

    const parsed = createSessionSchema.safeParse({
      title: rawTitle || undefined,
      date: new Date(dateStr),
      academicTerm,
      note,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "ข้อมูลรอบเช็กชื่อไม่ถูกต้อง",
      };
    }

    const finalTitle = parsed.data.title || (await generateAutoSessionTitle(parsed.data.date, academicTerm));

    const activeStudents = await prisma.student.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });

    const attendanceSession = await prisma.attendanceSession.create({
      data: {
        title: finalTitle,
        date: parsed.data.date,
        academicTerm: parsed.data.academicTerm,
        note: parsed.data.note,
        createdById: currentUser.id,
        records: {
          create: activeStudents.map((s) => ({
            studentId: s.id,
            status: "ABSENT",
          })),
        },
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "CREATE_ATTENDANCE_SESSION",
      targetType: "ATTENDANCE",
      targetId: attendanceSession.id,
      details: `สร้างรอบเช็กชื่อ: "${attendanceSession.title}" (ตั้งต้น ขาดเรียน ทุกคน)`,
    });

    revalidatePath("/admin/attendance");
    revalidatePath(`/admin/attendance/${attendanceSession.id}`);
    revalidatePath("/student/attendance");

    return {
      success: true,
      message: `สร้างรอบเช็กชื่อ "${attendanceSession.title}" เรียบร้อยแล้ว (ตั้งต้น ขาดเรียน ทุกคน เพื่อรอเช็กชื่อ)`,
      sessionId: attendanceSession.id,
    };
  } catch (error) {
    console.error("createAttendanceSessionAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการสร้างรอบเช็กชื่อ" };
  }
}

/**
 * Server Action สำหรับคลิกวันที่ในปฏิทินเพื่อสร้างรอบเช็กชื่อทันทีโดยอัตโนมัติ
 */
export async function createAttendanceSessionForDateAction(
  dateStr: string,
  academicTerm: string = "1/2569"
): Promise<AttendanceActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_ATTENDANCE");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) {
      return { success: false, message: "วันที่ไม่ถูกต้อง" };
    }

    const finalTitle = await generateAutoSessionTitle(targetDate, academicTerm);

    const activeStudents = await prisma.student.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });

    const attendanceSession = await prisma.attendanceSession.create({
      data: {
        title: finalTitle,
        date: targetDate,
        academicTerm,
        createdById: currentUser.id,
        records: {
          create: activeStudents.map((s) => ({
            studentId: s.id,
            status: "ABSENT",
          })),
        },
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "CREATE_ATTENDANCE_SESSION",
      targetType: "ATTENDANCE",
      targetId: attendanceSession.id,
      details: `สร้างรอบเช็กชื่อผ่านปฏิทิน: "${attendanceSession.title}"`,
    });

    revalidatePath("/admin/attendance");
    revalidatePath(`/admin/attendance/${attendanceSession.id}`);
    revalidatePath("/student/attendance");

    return {
      success: true,
      message: `สร้างรอบเช็กชื่อ "${attendanceSession.title}" สำเร็จ`,
      sessionId: attendanceSession.id,
    };
  } catch (error) {
    console.error("createAttendanceSessionForDateAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการสร้างรอบเช็กชื่อ" };
  }
}

/**
 * Server Action สำหรับครูแก้ไขข้อมูลรอบเช็กชื่อ (ชื่อหรือวันที่)
 */
export async function updateAttendanceSessionInfoAction(
  sessionId: string,
  formData: FormData
): Promise<AttendanceActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_ATTENDANCE");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const title = (formData.get("title") as string)?.trim();
    const dateStr = formData.get("date") as string;
    const defaultTerm = await getSystemSetting("academic_term");
    const academicTerm = (formData.get("academicTerm") as string)?.trim() || defaultTerm || "1/2569";
    const note = (formData.get("note") as string)?.trim() || undefined;

    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        title,
        date: new Date(dateStr),
        academicTerm,
        note,
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "UPDATE_ATTENDANCE_SESSION",
      targetType: "ATTENDANCE",
      targetId: sessionId,
      details: `แก้ไขข้อมูลรอบเช็กชื่อ "${title}"`,
    });

    revalidatePath("/admin/attendance");
    revalidatePath(`/admin/attendance/${sessionId}`);
    revalidatePath("/student/attendance");

    return {
      success: true,
      message: "อัปเดตข้อมูลรอบเช็กชื่อเรียบร้อยแล้ว",
      sessionId,
    };
  } catch (error) {
    console.error("updateAttendanceSessionInfoAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" };
  }
}

/**
 * Server Action สำหรับบันทึกการเช็กชื่อแบบกลุ่ม (Batch Update Records)
 */
/**
 * Server Action สำหรับบันทึกการเช็กชื่อแบบกลุ่ม (Batch Update Records)
 */
export async function updateAttendanceBatchAction(
  sessionId: string,
  records: { studentId: string; status: AttendanceStatusType; note?: string }[]
): Promise<AttendanceActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_ATTENDANCE");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    // 1. ดึงข้อมูลเดิมทั้งหมดเพื่อตรวจสอบความเปลี่ยนแปลง และรักษา Timestamp สแกนเดิมไว้
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: { sessionId },
      select: {
        id: true,
        studentId: true,
        status: true,
        note: true,
        checkInMethod: true,
        checkedAt: true,
      },
    });
    const existingMap = new Map(existingRecords.map((e) => [e.studentId, e]));

    const now = new Date();

    // 2. คัดกรองเฉพาะ Record ที่มีการเปลี่ยนแปลงจริง ๆ เพื่อลด Database writes และป้องกันข้อมูลทับซ้อน
    const toUpdate = records.filter((r) => {
      const ex = existingMap.get(r.studentId);
      if (!ex) return true;
      const cleanNote = r.note?.trim() || null;
      return ex.status !== r.status || (ex.note || null) !== cleanNote;
    });

    if (toUpdate.length === 0) {
      return {
        success: true,
        message: "บันทึกผลการเช็กชื่อเรียบร้อยแล้ว (ไม่มีข้อมูลเปลี่ยนแปลง)",
      };
    }

    // 3. ประมวลผลการบันทึกข้อมูลแบบ Concurrent Chunks
    const chunkSize = 25;
    for (let i = 0; i < toUpdate.length; i += chunkSize) {
      const chunk = toUpdate.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((r) => {
          const ex = existingMap.get(r.studentId);
          // ถ้าสถานะเปลี่ยนเป็น PRESENT โดยคุณครูแบบ Manual ให้ใช้เวลาปัจจุบันและ method: "MANUAL"
          // ถ้าสถานะไม่ได้เปลี่ยน หรือเป็นการเช็ก QR มาก่อน ให้คงเวลา checkedAt และ checkInMethod เดิมไว้
          const isManualStatusChange = !ex || ex.status !== r.status;
          const checkedAt = isManualStatusChange ? now : ex.checkedAt;
          const checkInMethod =
            r.status === "PRESENT"
              ? ex?.checkInMethod || "MANUAL"
              : r.status === "ABSENT"
              ? null
              : ex?.checkInMethod;

          return prisma.attendanceRecord.upsert({
            where: {
              sessionId_studentId: {
                sessionId,
                studentId: r.studentId,
              },
            },
            update: {
              status: r.status,
              note: r.note?.trim() || null,
              checkedAt,
              checkInMethod,
            },
            create: {
              sessionId,
              studentId: r.studentId,
              status: r.status,
              note: r.note?.trim() || null,
              checkedAt,
              checkInMethod,
            },
          });
        })
      );
    }

    // แจ้งเตือน Event Stream ไปยังหน้าจอโปรเจกเตอร์
    attendanceEventBus.emit("session_batch_update", {
      sessionId,
      action: "SAVED",
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "SAVE_ATTENDANCE_RECORD",
      targetType: "ATTENDANCE",
      targetId: sessionId,
      details: `บันทึกการเช็กชื่อนักเรียน (ปรับปรุง ${toUpdate.length} จากทั้งหมด ${records.length} คน)`,
    });

    revalidatePath(`/admin/attendance/${sessionId}`);
    revalidatePath("/admin/attendance");
    revalidatePath("/student/attendance");

    return {
      success: true,
      message: `บันทึกผลการเช็กชื่อเรียบร้อยแล้ว (อัปเดต ${toUpdate.length} รายการ)`,
    };
  } catch (error) {
    console.error("updateAttendanceBatchAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการบันทึกการเช็กชื่อ" };
  }
}

/**
 * Server Action สำหรับปุ่มลัดเปลี่ยนสถานะทุกคนพร้อมกัน เช่น "เช็กมาครบทุกคน" หรือ "รีเซ็ตเป็นขาดเรียน"
 */
export async function markAllAttendanceStatusAction(
  sessionId: string,
  status: AttendanceStatusType
): Promise<AttendanceActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_ATTENDANCE");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const now = new Date();

    if (status === "ABSENT") {
      // กรณีรีเซ็ตทุกคนเป็น ขาดเรียน เพื่อเริ่มนับการเช็กชื่อใหม่ ให้เคลียร์ข้อมูลสแกนและพิกัดเดิมทิ้งทั้งหมด
      await prisma.attendanceRecord.updateMany({
        where: { sessionId },
        data: {
          status: "ABSENT",
          checkedAt: now,
          checkInMethod: null,
          latitude: null,
          longitude: null,
          locationAccuracy: null,
          distanceFromSession: null,
          hasLocation: false,
          note: null,
        },
      });
    } else if (status === "PRESENT") {
      // กรณีเช็กมาครบทุกคน ให้ระบุ checkInMethod เป็น MANUAL
      await prisma.attendanceRecord.updateMany({
        where: { sessionId },
        data: {
          status: "PRESENT",
          checkedAt: now,
          checkInMethod: "MANUAL",
        },
      });
    } else {
      await prisma.attendanceRecord.updateMany({
        where: { sessionId },
        data: {
          status,
          checkedAt: now,
        },
      });
    }

    // กระจาย Event แจ้งเตือนไปยังหน้าจอโปรเจกเตอร์และหน้าอื่นๆ ให้รีเฟรชทันที
    attendanceEventBus.emit("session_batch_update", {
      sessionId,
      action: status === "ABSENT" ? "RESET_ALL_ABSENT" : "MARK_ALL_PRESENT",
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "SAVE_ATTENDANCE_RECORD",
      targetType: "ATTENDANCE",
      targetId: sessionId,
      details: `ปรับสถานะเช็กชื่อทุกคนในรอบนี้เป็น "${status}"`,
    });

    revalidatePath(`/admin/attendance/${sessionId}`);
    revalidatePath("/admin/attendance");
    revalidatePath("/student/attendance");

    return {
      success: true,
      message: `ปรับสถานะนักเรียนทุกคนเป็น "${status === "PRESENT" ? "มาเรียน" : status}" เรียบร้อยแล้ว`,
    };
  } catch (error) {
    console.error("markAllAttendanceStatusAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการปรับสถานะ" };
  }
}

/**
 * Server Action ลบรอบเช็กชื่อ
 */
export async function deleteAttendanceSessionAction(
  sessionId: string
): Promise<AttendanceActionResult> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_ATTENDANCE");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const sessionToDelete = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      select: { title: true },
    });

    await prisma.attendanceSession.delete({
      where: { id: sessionId },
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "DELETE_ATTENDANCE_SESSION",
      targetType: "ATTENDANCE",
      targetId: sessionId,
      details: `ลบรอบเช็กชื่อ "${sessionToDelete?.title || sessionId}"`,
    });

    revalidatePath("/admin/attendance");
    revalidatePath("/student/attendance");

    return {
      success: true,
      message: "ลบรอบการเช็กชื่อเรียบร้อยแล้ว",
    };
  } catch (error) {
    console.error("deleteAttendanceSessionAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการลบรอบเช็กชื่อ" };
  }
}
