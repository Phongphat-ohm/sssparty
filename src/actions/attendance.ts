"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { getAuthSession } from "@/lib/auth/session";

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
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "ไม่มีสิทธิ์ในการดำเนินการนี้" };
    }

    const rawTitle = (formData.get("title") as string)?.trim();
    const dateStr = formData.get("date") as string;
    const academicTerm = (formData.get("academicTerm") as string)?.trim() || "1/2569";
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
        message: parsed.error.issues[0]?.message || "ข้อมูลรอบการเช็กชื่อไม่ถูกต้อง",
      };
    }

    const finalTitle =
      parsed.data.title ||
      (await generateAutoSessionTitle(parsed.data.date, parsed.data.academicTerm));

    // ดึงนักเรียนที่กำลังใช้งานทั้งหมดในระบบ
    const activeStudents = await prisma.student.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });

    // สร้าง Session พร้อมสร้าง Records เริ่มต้นเป็น "PRESENT" (มาเรียน) ให้ทุกคน
    const attendanceSession = await prisma.attendanceSession.create({
      data: {
        title: finalTitle,
        date: parsed.data.date,
        academicTerm: parsed.data.academicTerm,
        note: parsed.data.note,
        createdById: session.userId,
        records: {
          create: activeStudents.map((s) => ({
            studentId: s.id,
            status: "PRESENT",
          })),
        },
      },
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
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "ไม่มีสิทธิ์ในการดำเนินการนี้" };
    }

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
        createdById: session.userId,
        records: {
          create: activeStudents.map((s) => ({
            studentId: s.id,
            status: "PRESENT",
          })),
        },
      },
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
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "ไม่มีสิทธิ์ในการดำเนินการนี้" };
    }

    const title = (formData.get("title") as string)?.trim();
    const dateStr = formData.get("date") as string;
    const academicTerm = (formData.get("academicTerm") as string)?.trim() || "1/2569";
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
export async function updateAttendanceBatchAction(
  sessionId: string,
  records: { studentId: string; status: AttendanceStatusType; note?: string }[]
): Promise<AttendanceActionResult> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "ไม่มีสิทธิ์ในการดำเนินการนี้" };
    }

    // ประมวลผลการบันทึกข้อมูลแบบ Concurrent Chunks เพื่อความรวดเร็วและป้องกัน Transaction Timeout
    const chunkSize = 25;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((r) =>
          prisma.attendanceRecord.upsert({
            where: {
              sessionId_studentId: {
                sessionId,
                studentId: r.studentId,
              },
            },
            update: {
              status: r.status,
              note: r.note?.trim() || null,
              checkedAt: new Date(),
            },
            create: {
              sessionId,
              studentId: r.studentId,
              status: r.status,
              note: r.note?.trim() || null,
              checkedAt: new Date(),
            },
          })
        )
      );
    }

    revalidatePath(`/admin/attendance/${sessionId}`);
    revalidatePath("/admin/attendance");
    revalidatePath("/student/attendance");

    return {
      success: true,
      message: "บันทึกผลการเช็กชื่อเรียบร้อยแล้ว",
    };
  } catch (error) {
    console.error("updateAttendanceBatchAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการบันทึกการเช็กชื่อ" };
  }
}

/**
 * Server Action สำหรับปุ่มลัดเปลี่ยนสถานะทุกคนพร้อมกัน เช่น "เช็กมาครบทุกคน"
 */
export async function markAllAttendanceStatusAction(
  sessionId: string,
  status: AttendanceStatusType
): Promise<AttendanceActionResult> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "ไม่มีสิทธิ์ในการดำเนินการนี้" };
    }

    await prisma.attendanceRecord.updateMany({
      where: { sessionId },
      data: {
        status,
        checkedAt: new Date(),
      },
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
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "ไม่มีสิทธิ์ในการดำเนินการนี้" };
    }

    await prisma.attendanceSession.delete({
      where: { id: sessionId },
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
