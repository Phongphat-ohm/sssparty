import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getAuthSession } from "@/lib/auth/session";
import {
  attendanceEventBus,
  CheckInEventPayload,
  SessionStatePayload,
} from "@/lib/attendance/attendance-events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new Response("Missing sessionId", { status: 400 });
  }

  // ดึงข้อมูลสถานะเริ่มต้นของรอบเช็กชื่อ
  const attendanceSession = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      records: {
        include: {
          student: true,
        },
      },
    },
  });

  if (!attendanceSession) {
    return new Response("Attendance session not found", { status: 404 });
  }

  // รองรับ format=json หรือ polling fallback
  const format = searchParams.get("format");
  if (format === "json" || req.headers.get("accept")?.includes("application/json")) {
    const totalStudents = attendanceSession.records.length;
    const presentCount = attendanceSession.records.filter((r) => r.status === "PRESENT").length;
    const lateCount = attendanceSession.records.filter((r) => r.status === "LATE").length;
    const absentCount = attendanceSession.records.filter((r) => r.status === "ABSENT").length;
    const leaveCount = attendanceSession.records.filter((r) => r.status === "LEAVE").length;

    return Response.json({
      success: true,
      sessionId: attendanceSession.id,
      isKeyActive: attendanceSession.isKeyActive,
      keySecret: attendanceSession.isKeyActive ? attendanceSession.keySecret : null,
      totalStudents,
      presentCount,
      lateCount,
      absentCount,
      leaveCount,
      recentCheckins: attendanceSession.records
        .filter((r) => r.status === "PRESENT" || r.status === "LATE")
        .sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime())
        .slice(0, 25)
        .map((r) => ({
          studentId: r.student.id,
          studentCode: r.student.studentCode,
          studentName: `${r.student.firstName} ${r.student.lastName}`,
          className: r.student.className,
          studentNumber: r.student.studentNumber,
          checkedAt: r.checkedAt.toISOString(),
          checkInMethod: r.checkInMethod || "MANUAL",
          hasLocation: r.hasLocation,
          distanceFromSession: r.distanceFromSession,
          locationAccuracy: r.locationAccuracy,
          status: r.status,
        })),
      allRecords: attendanceSession.records.map((r) => ({
        studentId: r.student.id,
        status: r.status,
        checkInMethod: r.checkInMethod,
        checkedAt: r.checkedAt.toISOString(),
        hasLocation: r.hasLocation,
        latitude: r.latitude,
        longitude: r.longitude,
        locationAccuracy: r.locationAccuracy,
        distanceFromSession: r.distanceFromSession,
      })),
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. ส่ง Initial State ทันทีที่เชื่อมต่อ
      const totalStudents = attendanceSession.records.length;
      const presentCount = attendanceSession.records.filter(
        (r) => r.status === "PRESENT"
      ).length;
      const lateCount = attendanceSession.records.filter(
        (r) => r.status === "LATE"
      ).length;

      const initialData = {
        type: "INITIAL_STATE",
        sessionId: attendanceSession.id,
        isKeyActive: attendanceSession.isKeyActive,
        keySecret: attendanceSession.isKeyActive ? attendanceSession.keySecret : null,
        totalStudents,
        presentCount,
        lateCount,
        recentCheckins: attendanceSession.records
          .filter((r) => r.status === "PRESENT" || r.status === "LATE")
          .sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime())
          .slice(0, 15)
          .map((r) => ({
            studentId: r.student.id,
            studentCode: r.student.studentCode,
            studentName: `${r.student.firstName} ${r.student.lastName}`,
            className: r.student.className,
            studentNumber: r.student.studentNumber,
            checkedAt: r.checkedAt.toISOString(),
            checkInMethod: r.checkInMethod || "MANUAL",
            hasLocation: r.hasLocation,
            distanceFromSession: r.distanceFromSession,
            status: r.status,
          })),
      };

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
      );

      // 2. Listener รับ Event เมื่อมีนักเรียนเช็กชื่อใหม่
      const onCheckIn = (payload: CheckInEventPayload) => {
        if (payload.sessionId === sessionId) {
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "NEW_CHECKIN",
                  ...payload,
                })}\n\n`
              )
            );
          } catch {
            // controller might be closed
          }
        }
      };

      // 3. Listener รับ Event เมื่อมีการเปลี่ยนสถานะเปิด/ปิดรอบ
      const onSessionState = (payload: SessionStatePayload) => {
        if (payload.sessionId === sessionId) {
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "SESSION_STATE_CHANGED",
                  ...payload,
                })}\n\n`
              )
            );
          } catch {
            // controller closed
          }
        }
      };

      // 4. Listener รับ Event เมื่อมีการปรับสถานะแบบกลุ่ม (เช่น รีเซ็ตเป็นขาด, ปรับคนค้างเป็นขาด)
      const onBatchUpdate = (payload: { sessionId: string; action: string }) => {
        if (payload.sessionId === sessionId) {
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "BATCH_UPDATE",
                  ...payload,
                })}\n\n`
              )
            );
          } catch {
            // controller closed
          }
        }
      };

      attendanceEventBus.on("checkin", onCheckIn);
      attendanceEventBus.on("session_state", onSessionState);
      attendanceEventBus.on("session_batch_update", onBatchUpdate);

      // 5. Heartbeat ทุก 15 วินาที เพื่อป้องกัน Timeout
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // 6. Cleanup เมื่อปิดการเชื่อมต่อ
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        attendanceEventBus.off("checkin", onCheckIn);
        attendanceEventBus.off("session_state", onSessionState);
        attendanceEventBus.off("session_batch_update", onBatchUpdate);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // ปิด Buffer ของ Nginx/Reverse Proxy
    },
  });
}
