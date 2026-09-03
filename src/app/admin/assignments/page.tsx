import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import {
  AdminAssignmentsClient,
  AssignmentItem,
} from "@/components/admin/AdminAssignmentsClient";

export default async function AdminAssignmentsPage() {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const totalStudents = await prisma.student.count({ where: { status: "ACTIVE" } });

  const assignments = await prisma.assignment.findMany({
    include: {
      rubrics: { select: { id: true } },
      submissions: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const assignmentItems: AssignmentItem[] = assignments.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    maxScore: a.maxScore,
    dueDate: a.dueDate.toISOString(),
    status: a.status,
    rubricCount: a.rubrics.length,
    submissionsCount: a.submissions.length,
    gradedCount: a.submissions.filter((s) => s.status === "GRADED").length,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full">
      <AdminAssignmentsClient
        initialAssignments={assignmentItems}
        totalStudents={totalStudents}
      />
    </div>
  );
}
