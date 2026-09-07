import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { DynamicKeyProjectorScreen } from "@/components/admin/attendance/DynamicKeyProjectorScreen";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "จอโปรเจกเตอร์เช็กชื่อสด (Projector Studio) | SSSParty",
  description: "โหมดฉายจอโปรเจกเตอร์สำหรับห้องเรียน รหัส Key 6 หลัก และ QR Code เช็กชื่อ",
};

export default async function AdminAttendanceProjectorPage({ params }: PageProps) {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const { id } = await params;

  const attendanceSession = await prisma.attendanceSession.findUnique({
    where: { id },
    include: {
      records: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!attendanceSession) {
    notFound();
  }

  const totalStudents = await prisma.student.count({
    where: { status: "ACTIVE" },
  });

  const centerCoords =
    attendanceSession.centerLatitude && attendanceSession.centerLongitude
      ? {
          latitude: attendanceSession.centerLatitude,
          longitude: attendanceSession.centerLongitude,
          expectedRadius: attendanceSession.expectedRadius || 100,
        }
      : null;

  return (
    <DynamicKeyProjectorScreen
      sessionId={attendanceSession.id}
      sessionTitle={attendanceSession.title}
      academicTerm={attendanceSession.academicTerm}
      totalStudents={totalStudents}
      initialIsActive={attendanceSession.isKeyActive}
      initialKeySecret={attendanceSession.keySecret}
      initialCenterCoords={centerCoords}
    />
  );
}
