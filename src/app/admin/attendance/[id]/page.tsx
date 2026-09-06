import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import {
  AttendanceSheetClient,
  StudentAttendanceRow,
} from "@/components/admin/AttendanceSheetClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminAttendanceDetailPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const { id } = await params;

  const attendanceSession = await prisma.attendanceSession.findUnique({
    where: { id },
    include: {
      records: {
        include: {
          student: true,
        },
      },
    },
  });

  if (!attendanceSession) {
    notFound();
  }

  // ดึงนักเรียนที่มีสถานะ ACTIVE ทั้งหมด เพื่อตรวจสอบว่ามีคนตกหล่นหรือไม่
  const allActiveStudents = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ className: "asc" }, { studentNumber: "asc" }],
  });

  // สร้าง records map
  const existingRecordsMap = new Map(
    attendanceSession.records.map((r) => [r.studentId, r])
  );

  // ถ้ามีนักเรียนใหม่ที่ยังไม่มี record ให้สร้างเตรียมไว้
  const rows: StudentAttendanceRow[] = allActiveStudents.map((s) => {
    const existing = existingRecordsMap.get(s.id);
    return {
      studentId: s.id,
      studentCode: s.studentCode,
      firstName: s.firstName,
      lastName: s.lastName,
      className: s.className,
      studentNumber: s.studentNumber,
      status: existing ? existing.status : "ABSENT",
      note: existing?.note || null,
      checkInMethod: existing?.checkInMethod || null,
      checkedAt: existing?.checkedAt ? existing.checkedAt.toISOString() : null,
      latitude: existing?.latitude || null,
      longitude: existing?.longitude || null,
      locationAccuracy: existing?.locationAccuracy || null,
      distanceFromSession: existing?.distanceFromSession || null,
      hasLocation: existing?.hasLocation || false,
      ipAddress: existing?.ipAddress || null,
    };
  });

  const classList = Array.from(new Set(allActiveStudents.map((s) => s.className)));

  const centerCoords =
    attendanceSession.centerLatitude && attendanceSession.centerLongitude
      ? {
          latitude: attendanceSession.centerLatitude,
          longitude: attendanceSession.centerLongitude,
          expectedRadius: attendanceSession.expectedRadius || 100,
        }
      : null;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full">
      <AttendanceSheetClient
        sessionId={attendanceSession.id}
        sessionTitle={attendanceSession.title}
        sessionDate={attendanceSession.date.toISOString()}
        academicTerm={attendanceSession.academicTerm}
        sessionNote={attendanceSession.note}
        isKeyActive={attendanceSession.isKeyActive}
        keySecret={attendanceSession.keySecret}
        centerCoords={centerCoords}
        initialRecords={rows}
        classList={classList}
      />
    </div>
  );
}
