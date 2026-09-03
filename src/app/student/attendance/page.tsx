import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import {
  StudentAttendanceCalendar,
  StudentAttendanceItem,
} from "@/components/student/StudentAttendanceCalendar";

export default async function StudentAttendancePage() {
  const session = await getAuthSession();
  if (!session || session.role !== "STUDENT" || !session.studentId) {
    redirect("/student-login");
  }

  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    include: {
      attendanceRecords: {
        include: {
          session: true,
        },
        orderBy: {
          session: {
            date: "desc",
          },
        },
      },
    },
  });

  if (!student) {
    redirect("/student-login");
  }

  const records: StudentAttendanceItem[] = student.attendanceRecords.map((ar) => ({
    sessionId: ar.session.id,
    sessionTitle: ar.session.title,
    sessionDate: ar.session.date.toISOString(),
    academicTerm: ar.session.academicTerm,
    sessionNote: ar.session.note,
    status: ar.status,
    recordNote: ar.note,
    checkedAt: ar.checkedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <StudentAttendanceCalendar
        records={records}
        studentName={`${student.firstName} ${student.lastName}`}
        studentCode={student.studentCode}
      />
    </div>
  );
}
