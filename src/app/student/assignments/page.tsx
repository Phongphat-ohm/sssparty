import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import {
  StudentAssignmentsClient,
  StudentAssignmentItem,
} from "@/components/student/StudentAssignmentsClient";

export default async function StudentAssignmentsPage() {
  const session = await getAuthSession();
  if (!session || session.role !== "STUDENT" || !session.studentId) {
    redirect("/student-login");
  }

  const assignments = await prisma.assignment.findMany({
    where: { status: "PUBLISHED" },
    include: {
      rubrics: { select: { id: true } },
      submissions: {
        where: { studentId: session.studentId },
        include: { grade: { select: { score: true } } },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const assignmentItems: StudentAssignmentItem[] = assignments.map((a) => {
    const sub = a.submissions[0];
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      maxScore: a.maxScore,
      dueDate: a.dueDate.toISOString(),
      rubricCount: a.rubrics.length,
      submission: sub
        ? {
            id: sub.id,
            status: sub.status as any,
            score: sub.grade?.score,
          }
        : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#3F342B] tracking-tight">
          ภาระงานและการบ้าน (Assignments)
        </h1>
        <p className="text-xs sm:text-sm text-[#7A6A5C]">
          ติดตามและส่งชิ้นงานสร้างสรรค์ตามกำหนดเวลาของชุมนุมสื่อสร้างสรรค์
        </p>
      </div>

      <StudentAssignmentsClient assignments={assignmentItems} />
    </div>
  );
}
