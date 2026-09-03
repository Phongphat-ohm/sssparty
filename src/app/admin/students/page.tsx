import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { StudentsTableClient } from "@/components/admin/StudentsTableClient";

export default async function AdminStudentsPage() {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const allStudents = await prisma.student.findMany({
    include: {
      submissions: {
        include: {
          grade: true,
          assignment: { select: { maxScore: true } },
        },
      },
    },
    orderBy: [{ className: "asc" }, { studentNumber: "asc" }],
  });

  const classList = Array.from(new Set(allStudents.map((s) => s.className)));

  const formattedStudents = allStudents.map((s) => {
    const gradedSubmissions = s.submissions.filter(
      (sub) => sub.status === "GRADED" && sub.grade
    );
    const totalScoreEarned = gradedSubmissions.reduce(
      (acc, sub) => acc + (sub.grade?.score || 0),
      0
    );
    const totalMaxScore = gradedSubmissions.reduce(
      (acc, sub) => acc + (sub.assignment.maxScore || 0),
      0
    );

    return {
      id: s.id,
      studentCode: s.studentCode,
      firstName: s.firstName,
      lastName: s.lastName,
      className: s.className,
      studentNumber: s.studentNumber,
      status: s.status,
      totalSubmissions: s.submissions.length,
      gradedCount: gradedSubmissions.length,
      totalScoreEarned,
      totalMaxScore,
    };
  });

  return (
    <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto">
      <StudentsTableClient
        initialStudents={formattedStudents}
        classList={classList}
      />
    </div>
  );
}
