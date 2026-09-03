import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import {
  AttendanceSessionsListClient,
  SessionItem,
} from "@/components/admin/AttendanceSessionsListClient";

export default async function AdminAttendancePage() {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const dbSessions = await prisma.attendanceSession.findMany({
    include: {
      records: {
        select: { status: true },
      },
    },
    orderBy: { date: "desc" },
  });

  const sessionItems: SessionItem[] = dbSessions.map((s) => {
    const total = s.records.length;
    const present = s.records.filter((r) => r.status === "PRESENT").length;
    const late = s.records.filter((r) => r.status === "LATE").length;
    const leave = s.records.filter((r) => r.status === "LEAVE").length;
    const absent = s.records.filter((r) => r.status === "ABSENT").length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return {
      id: s.id,
      title: s.title,
      date: s.date.toISOString(),
      academicTerm: s.academicTerm,
      note: s.note,
      totalStudents: total,
      presentCount: present,
      lateCount: late,
      leaveCount: leave,
      absentCount: absent,
      attendanceRate: rate,
    };
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <AttendanceSessionsListClient initialSessions={sessionItems} />
    </div>
  );
}
