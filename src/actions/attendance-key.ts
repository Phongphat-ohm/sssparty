"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { getAuthSession } from "@/lib/auth/session";
import { requireAdminPermission } from "@/lib/auth/permissions-server";
import { createAuditLog, getClientRequestContext } from "@/lib/audit/logger";
import {
  generateSessionSecret,
  generateDynamicKey,
  verifyDynamicKey,
} from "@/lib/attendance/dynamic-key";
import { calculateHaversineDistance } from "@/lib/attendance/geo-utils";
import { attendanceEventBus } from "@/lib/attendance/attendance-events";
import { isTimePastCutoff, formatThaiTime } from "@/lib/attendance/time-utils";
import { checkTermCanEdit, isTermLocked } from "@/lib/terms/term-service";

export interface StudentCheckInParams {
  sessionId: string;
  key: string;
  coords?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
  method?: "DYNAMIC_KEY" | "DYNAMIC_QR";
}

/**
 * ครูเปิดรอบเช็กชื่อแบบ Real-Time Dynamic Key (30 วินาที)
 */
export async function startDynamicKeySessionAction(
  sessionId: string,
  coords?: { latitude: number; longitude: number; expectedRadius?: number } | null
) {
  try {
    const authCheck = await requireAdminPermission("MANAGE_ATTENDANCE");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const existingSession = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });
    if (!existingSession) {
      return { success: false, message: "ไม่พบข้อมูลรอบเช็กชื่อ" };
    }

    const termCheck = await checkTermCanEdit(existingSession.academicTerm, currentUser);
    if (!termCheck.canEdit) {
      return { success: false, message: termCheck.reason };
    }

    // สร้าง secret สุ่มใหม่ หรือใช้ secret เดิมถ้ามีอยู่แล้ว
    const keySecret = existingSession.keySecret || generateSessionSecret();

    const updated = await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        isKeyActive: true,
        keySecret,
        centerLatitude: coords?.latitude ?? existingSession.centerLatitude,
        centerLongitude: coords?.longitude ?? existingSession.centerLongitude,
        expectedRadius: coords?.expectedRadius ?? existingSession.expectedRadius ?? 100,
      },
    });

    // ยิง Event แจ้งว่าเซสชันเปิดแล้ว
    attendanceEventBus.emit("session_state", {
      sessionId,
      isKeyActive: true,
      keySecret,
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "START_DYNAMIC_KEY_SESSION" as any,
      targetType: "ATTENDANCE",
      targetId: sessionId,
      details: JSON.stringify({
        title: updated.title,
        hasCenterCoords: !!(updated.centerLatitude && updated.centerLongitude),
        expectedRadius: updated.expectedRadius,
      }),
    });

    revalidatePath(`/admin/attendance/${sessionId}`);
    revalidatePath("/student/checkin");
    revalidatePath("/student/attendance");

    const initialKey = generateDynamicKey(keySecret);

    return {
      success: true,
      message: "เปิดรับการเช็กชื่อแบบ Dynamic Key เรียบร้อยแล้ว",
      keySecret,
      currentKey: initialKey.key,
      remainingSeconds: initialKey.remainingSeconds,
      centerCoords:
        updated.centerLatitude && updated.centerLongitude
          ? {
              latitude: updated.centerLatitude,
              longitude: updated.centerLongitude,
              expectedRadius: updated.expectedRadius || 100,
            }
          : null,
    };
  } catch (error: any) {
    console.error("startDynamicKeySessionAction error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดในการเปิดระบบ" };
  }
}

/**
 * ครูปิดรับการเช็กชื่อรอบนี้
 */
export async function stopDynamicKeySessionAction(sessionId: string) {
  try {
    const authCheck = await requireAdminPermission("MANAGE_ATTENDANCE");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        isKeyActive: false,
      },
    });

    attendanceEventBus.emit("session_state", {
      sessionId,
      isKeyActive: false,
      keySecret: null,
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "STOP_DYNAMIC_KEY_SESSION" as any,
      targetType: "ATTENDANCE",
      targetId: sessionId,
      details: "ปิดรับการเช็กชื่อ Dynamic Key",
    });

    revalidatePath(`/admin/attendance/${sessionId}`);
    revalidatePath("/student/checkin");
    revalidatePath("/student/attendance");

    return { success: true, message: "ปิดรับการเช็กชื่อเรียบร้อยแล้ว" };
  } catch (error: any) {
    console.error("stopDynamicKeySessionAction error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดในการปิดระบบ" };
  }
}

/**
 * ดึงรอบเช็กชื่อที่กำลังเปิดอยู่ สำหรับหน้านักเรียนเข้าเช็กชื่ออัตโนมัติ
 */
export async function getActiveAttendanceSessionForStudentAction() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "STUDENT" || !session.studentId) {
      return { success: false, message: "กรุณาเข้าสู่ระบบในฐานะนักเรียน" };
    }

    // หารอบที่กำลังเปิดใช้งานอยู่ล่าสุด
    const activeSession = await prisma.attendanceSession.findFirst({
      where: { isKeyActive: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        date: true,
        academicTerm: true,
        note: true,
        onTimeCutoffTime: true,
      },
    });

    if (!activeSession) {
      return { success: true, activeSession: null };
    }

    // ตรวจสอบว่านักเรียนคนนี้เช็กชื่อในรอบนี้หรือยัง
    const myRecord = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: activeSession.id,
          studentId: session.studentId,
        },
      },
      select: {
        status: true,
        checkedAt: true,
        checkInMethod: true,
        customCutoffTime: true,
      },
    });

    const effectiveCutoffTime = myRecord?.customCutoffTime || activeSession.onTimeCutoffTime || null;

    return {
      success: true,
      activeSession: {
        ...activeSession,
        date: activeSession.date.toISOString(),
      },
      effectiveCutoffTime,
      alreadyCheckedIn:
        (myRecord?.status === "PRESENT" || myRecord?.status === "LATE") &&
        (myRecord?.checkInMethod === "DYNAMIC_KEY" || myRecord?.checkInMethod === "DYNAMIC_QR"),
      myRecord: myRecord
        ? {
            ...myRecord,
            checkedAt: myRecord.checkedAt.toISOString(),
          }
        : null,
    };
  } catch (error: any) {
    console.error("getActiveAttendanceSessionForStudentAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลรอบเช็กชื่อ" };
  }
}

/**
 * นักเรียนยืนยันการเช็กชื่อด้วยรหัส Key 6 หลัก หรือ QR Code
 */
export async function studentCheckInAction(params: StudentCheckInParams) {
  try {
    const authSession = await getAuthSession();
    if (!authSession || authSession.role !== "STUDENT" || !authSession.studentId) {
      return {
        success: false,
        message: "กรุณาเข้าสู่ระบบในฐานะนักเรียนก่อนทำการเช็กชื่อ",
      };
    }

    const { sessionId, key, coords, method = "DYNAMIC_KEY" } = params;

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (!attendanceSession) {
      return { success: false, message: "ไม่พบข้อมูลรอบเช็กชื่อนี้ในระบบ" };
    }

    if (await isTermLocked(attendanceSession.academicTerm)) {
      return {
        success: false,
        message: "ภาคเรียนนี้ถูกล็อกแล้ว ไม่สามารถเช็กชื่อได้",
      };
    }

    if (!attendanceSession.isKeyActive || !attendanceSession.keySecret) {
      await createAuditLog({
        username: authSession.username,
        role: "STUDENT",
        action: "CHECK_IN_FAILED",
        targetType: "ATTENDANCE",
        targetId: sessionId,
        details: `เช็กชื่อไม่สำเร็จ: รอบการเช็กชื่อ "${attendanceSession.title}" ไม่ได้เปิดรับ หรือปิดไปแล้ว`,
      });

      return {
        success: false,
        message: "รอบการเช็กชื่อนี้ไม่ได้เปิดรับ หรือครูได้ปิดระบบไปแล้ว",
      };
    }

    // 1. ตรวจสอบความถูกต้องของ Dynamic Key (มี Grace Window 30 วินาที)
    const verification = verifyDynamicKey(attendanceSession.keySecret, key);
    if (!verification.valid) {
      await createAuditLog({
        username: authSession.username,
        role: "STUDENT",
        action: "CHECK_IN_FAILED",
        targetType: "ATTENDANCE",
        targetId: sessionId,
        details: `เช็กชื่อไม่สำเร็จ: รหัส Key "${key}" ไม่ถูกต้องหรือหมดอายุแล้ว (รอบ: "${attendanceSession.title}")`,
      });

      return {
        success: false,
        message:
          "รหัส Key 6 หลักไม่ถูกต้อง หรือหมดอายุแล้ว (รหัสจะเปลี่ยนใหม่ทุก 30 วินาทีบนหน้าจอครู)",
      };
    }

    // 2. ดึงข้อมูลนักเรียน
    const student = await prisma.student.findUnique({
      where: { id: authSession.studentId },
    });
    if (!student) {
      return { success: false, message: "ไม่พบข้อมูลนักเรียน" };
    }

    // 2.1 ตรวจสอบว่านักเรียนเช็กชื่อในรอบนี้ไปแล้วหรือไม่ เพื่อป้องกันการส่งซ้ำซ้อน
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: attendanceSession.id,
          studentId: student.id,
        },
      },
    });

    if (
      existingRecord &&
      (existingRecord.status === "PRESENT" || existingRecord.status === "LATE") &&
      (existingRecord.checkInMethod === "DYNAMIC_KEY" || existingRecord.checkInMethod === "DYNAMIC_QR")
    ) {
      const isLateStatus = existingRecord.status === "LATE";
      return {
        success: true,
        alreadyCheckedIn: true,
        status: existingRecord.status,
        isLate: isLateStatus,
        message: isLateStatus
          ? "คุณได้เช็กชื่อเข้าเรียนในรอบนี้เรียบร้อยแล้ว (สถานะ: มาสาย)"
          : "คุณได้เช็กชื่อเข้าเรียนในรอบนี้เรียบร้อยแล้ว!",
        studentName: `${student.firstName} ${student.lastName}`,
        checkedAt: existingRecord.checkedAt.toISOString(),
        distanceMeters: existingRecord.distanceFromSession,
        hasLocation: existingRecord.hasLocation,
      };
    }

    // 3. ดึง Client Request Context (IP Address, User Agent)
    const clientContext = await getClientRequestContext();

    // 4. คำนวณระยะทาง ถ้ามีพิกัดของห้องเรียนและพิกัดของนักเรียน
    let distanceMeters: number | null = null;
    const hasLocation = !!(coords?.latitude && coords?.longitude);

    if (
      hasLocation &&
      attendanceSession.centerLatitude !== null &&
      attendanceSession.centerLongitude !== null
    ) {
      distanceMeters = calculateHaversineDistance(
        coords!.latitude,
        coords!.longitude,
        attendanceSession.centerLatitude,
        attendanceSession.centerLongitude
      );
    }

    const now = new Date();

    // 4.1 ตรวจสอบเวลา Cutoff (รายบุคคล หรือ ประจำรอบ)
    const effectiveCutoff = existingRecord?.customCutoffTime || attendanceSession.onTimeCutoffTime;
    let isLate = false;
    let finalStatus: "PRESENT" | "LATE" = "PRESENT";
    let autoNote = existingRecord?.note || null;

    if (effectiveCutoff) {
      isLate = isTimePastCutoff(now, effectiveCutoff);
      if (isLate) {
        finalStatus = "LATE";
        const thaiTime = formatThaiTime(now);
        autoNote = `เช็กชื่อเวลา ${thaiTime} (เกินกำหนด ${effectiveCutoff} น.)`;
      }
    }

    // 5. บันทึก/อัปเดต AttendanceRecord
    const record = await prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId: attendanceSession.id,
          studentId: student.id,
        },
      },
      update: {
        status: finalStatus,
        note: autoNote,
        checkedAt: now,
        checkInMethod: method,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        locationAccuracy: coords?.accuracy ?? null,
        distanceFromSession: distanceMeters,
        hasLocation,
        ipAddress: clientContext.ipAddress,
        userAgent: clientContext.userAgent,
      },
      create: {
        sessionId: attendanceSession.id,
        studentId: student.id,
        status: finalStatus,
        note: autoNote,
        checkedAt: now,
        checkInMethod: method,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        locationAccuracy: coords?.accuracy ?? null,
        distanceFromSession: distanceMeters,
        hasLocation,
        ipAddress: clientContext.ipAddress,
        userAgent: clientContext.userAgent,
      },
    });

    // 6. บันทึกความปลอดภัยลงในตาราง AuditLog ทุกครั้ง
    await createAuditLog({
      userId: null,
      username: student.studentCode,
      role: "STUDENT",
      action: "STUDENT_CHECK_IN" as any,
      targetType: "ATTENDANCE",
      targetId: record.id,
      details: JSON.stringify({
        sessionTitle: attendanceSession.title,
        studentName: `${student.firstName} ${student.lastName}`,
        className: student.className,
        studentNumber: student.studentNumber,
        method,
        hasLocation,
        distanceMeters,
        locationAccuracy: coords?.accuracy ?? null,
        ipAddress: clientContext.ipAddress,
        userAgent: clientContext.userAgent,
      }),
      ipAddress: clientContext.ipAddress,
      userAgent: clientContext.userAgent,
    });

    // 7. กระจาย Real-Time Broadcast ไปยังหน้าจอโปรเจกเตอร์ของครู
    attendanceEventBus.emit("checkin", {
      sessionId: attendanceSession.id,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: `${student.firstName} ${student.lastName}`,
      className: student.className,
      studentNumber: student.studentNumber,
      checkedAt: now.toISOString(),
      checkInMethod: method,
      hasLocation,
      distanceFromSession: distanceMeters,
      locationAccuracy: coords?.accuracy ?? null,
      status: "PRESENT",
    });

    revalidatePath(`/admin/attendance/${sessionId}`);
    revalidatePath("/student/checkin");
    revalidatePath("/student/attendance");

    return {
      success: true,
      status: finalStatus,
      isLate,
      message: isLate
        ? `เช็กชื่อสำเร็จ แต่เลยเวลาที่กำหนด (${effectiveCutoff} น.) ระบบบันทึกเป็น "มาสาย"`
        : "เช็กชื่อเข้าเรียนเรียบร้อยแล้ว!",
      studentName: `${student.firstName} ${student.lastName}`,
      checkedAt: record.checkedAt.toISOString(),
      distanceMeters,
      hasLocation,
    };
  } catch (error: any) {
    console.error("studentCheckInAction error:", error);
    return {
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการบันทึกการเช็กชื่อ",
    };
  }
}

/**
 * ครูปรับสถานะผู้ที่ยังไม่มาเช็กชื่อให้เป็น "ขาดเรียน (ABSENT)" ทั้งหมดในคลิกเดียว
 */
export async function batchMarkUncheckedAbsentAction(sessionId: string) {
  try {
    const authCheck = await requireAdminPermission("MANAGE_ATTENDANCE");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    // ค้นหานักเรียนที่ยังไม่ได้เช็กชื่อผ่าน Dynamic Key หรือ QR (รวมถึงคนที่มี checkInMethod เป็น null)
    // โดยยกเว้นนักเรียนที่มีใบลา (status: "LEAVE")
    const unchecked = await prisma.attendanceRecord.findMany({
      where: {
        sessionId,
        OR: [
          { checkInMethod: null },
          {
            checkInMethod: {
              notIn: ["DYNAMIC_KEY", "DYNAMIC_QR"],
            },
          },
        ],
        status: {
          not: "LEAVE",
        },
      },
      select: { id: true },
    });

    if (unchecked.length === 0) {
      return {
        success: true,
        message: "นักเรียนทุกคนเช็กชื่อเรียบร้อยแล้ว ไม่มีผู้ที่ยังค้างอยู่",
      };
    }

    await prisma.attendanceRecord.updateMany({
      where: {
        id: { in: unchecked.map((u) => u.id) },
      },
      data: {
        status: "ABSENT",
        note: "ไม่ได้เข้าเช็กชื่อในระบบตามเวลาที่กำหนด",
      },
    });

    // แจ้งเตือน Event Stream ไปยังหน้าจอโปรเจกเตอร์
    attendanceEventBus.emit("session_batch_update", {
      sessionId,
      action: "BATCH_ABSENT",
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "BATCH_MARK_ABSENT" as any,
      targetType: "ATTENDANCE",
      targetId: sessionId,
      details: `ปรับนักเรียนที่ยังไม่เช็กชื่อจำนวน ${unchecked.length} คน เป็น ขาดเรียน (ABSENT)`,
    });

    revalidatePath(`/admin/attendance/${sessionId}`);
    revalidatePath("/student/attendance");

    return {
      success: true,
      message: `ปรับสถานะผู้ที่ยังไม่เช็กชื่อจำนวน ${unchecked.length} คน เป็นขาดเรียนเรียบร้อยแล้ว`,
    };
  } catch (error: any) {
    console.error("batchMarkUncheckedAbsentAction error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาด" };
  }
}

/**
 * ครูอัปเดตหรือปักหมุดตำแหน่งห้องเรียนอ้างอิง (Center Coordinates & Expected Radius)
 * พร้อมคำนวณระยะห่างย้อนหลังของนักเรียนที่เช็กชื่อเข้ามาแล้ว
 */
export async function updateSessionClassroomLocationAction(
  sessionId: string,
  coords: {
    latitude: number;
    longitude: number;
    expectedRadius?: number;
  }
) {
  try {
    const authCheck = await requireAdminPermission("MANAGE_ATTENDANCE");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser } = authCheck;

    const existingSession = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        records: {
          where: {
            hasLocation: true,
            latitude: { not: null },
            longitude: { not: null },
          },
        },
      },
    });

    if (!existingSession) {
      return { success: false, message: "ไม่พบข้อมูลรอบเช็กชื่อ" };
    }

    const expectedRadius = coords.expectedRadius ?? existingSession.expectedRadius ?? 100;

    // อัปเดตพิกัดห้องเรียน
    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        centerLatitude: coords.latitude,
        centerLongitude: coords.longitude,
        expectedRadius,
      },
    });

    // คำนวณระยะห่างย้อนหลังให้กับนักเรียนที่มีพิกัดแล้ว
    if (existingSession.records.length > 0) {
      for (const rec of existingSession.records) {
        if (rec.latitude !== null && rec.longitude !== null) {
          const dist = calculateHaversineDistance(
            coords.latitude,
            coords.longitude,
            rec.latitude,
            rec.longitude
          );
          await prisma.attendanceRecord.update({
            where: { id: rec.id },
            data: { distanceFromSession: dist },
          });
        }
      }
    }

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "UPDATE_SESSION_LOCATION" as any,
      targetType: "ATTENDANCE",
      targetId: sessionId,
      details: JSON.stringify({
        centerLatitude: coords.latitude,
        centerLongitude: coords.longitude,
        expectedRadius,
        recalculatedStudents: existingSession.records.length,
      }),
    });

    revalidatePath(`/admin/attendance/${sessionId}`);
    revalidatePath(`/admin/attendance/${sessionId}/projector`);

    return {
      success: true,
      message: "บันทึกพิกัดห้องเรียนและคำนวณระยะห่างเรียบร้อยแล้ว",
      centerCoords: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        expectedRadius,
      },
    };
  } catch (error: any) {
    console.error("updateSessionClassroomLocationAction error:", error);
    return {
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการบันทึกตำแหน่งห้องเรียน",
    };
  }
}

