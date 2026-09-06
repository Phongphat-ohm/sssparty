import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { StudentCheckInClient } from "@/components/student/StudentCheckInClient";

export const metadata = {
  title: "เช็กชื่อเข้าเรียน (Real-Time Check-in) | SSSParty",
  description: "ระบบเช็กชื่อเข้าเรียนด้วยรหัส Key 6 หลักและ QR Code ชุมนุมสื่อสร้างสรรค์",
};

export default async function StudentCheckInPage() {
  const session = await getAuthSession();
  if (!session || session.role !== "STUDENT" || !session.studentId) {
    redirect("/student-login");
  }

  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    select: {
      id: true,
      studentCode: true,
      firstName: true,
      lastName: true,
      className: true,
      studentNumber: true,
    },
  });

  if (!student) {
    redirect("/student-login");
  }

  // ค้นหารอบเช็กชื่อที่เปิดอยู่
  const activeSession = await prisma.attendanceSession.findFirst({
    where: { isKeyActive: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      date: true,
      academicTerm: true,
      note: true,
    },
  });

  let myRecord = null;
  if (activeSession) {
    myRecord = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: activeSession.id,
          studentId: student.id,
        },
      },
      select: {
        status: true,
        checkedAt: true,
        checkInMethod: true,
      },
    });
  }

  const isCheckedIn =
    myRecord?.checkInMethod === "DYNAMIC_KEY" ||
    myRecord?.checkInMethod === "DYNAMIC_QR";

  return (
    <div className="py-2 sm:py-6">
      <StudentCheckInClient
        initialSession={
          activeSession
            ? {
                id: activeSession.id,
                title: activeSession.title,
                date: activeSession.date.toISOString(),
                academicTerm: activeSession.academicTerm,
                note: activeSession.note,
              }
            : null
        }
        initialRecord={
          isCheckedIn && myRecord
            ? {
                status: myRecord.status,
                checkedAt: myRecord.checkedAt.toISOString(),
                checkInMethod: myRecord.checkInMethod,
              }
            : null
        }
        studentName={`${student.firstName} ${student.lastName}`}
        studentCode={student.studentCode}
      />
    </div>
  );
}
