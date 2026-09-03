import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import {
  GradingQueueClient,
  GradingQueueItem,
} from "@/components/admin/GradingQueueClient";

export default async function AdminSubmissionsListPage() {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const submissions = await prisma.submission.findMany({
    include: {
      student: true,
      assignment: {
        select: {
          id: true,
          title: true,
          maxScore: true,
        },
      },
      grade: {
        select: { score: true },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const assignmentsList = await prisma.assignment.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const classList = Array.from(
    new Set(submissions.map((s) => s.student.className))
  ).sort();

  const items: GradingQueueItem[] = submissions.map((sub) => ({
    id: sub.id,
    studentId: sub.student.id,
    studentName: `${sub.student.firstName} ${sub.student.lastName}`,
    studentCode: sub.student.studentCode,
    className: sub.student.className,
    studentNumber: sub.student.studentNumber,
    assignmentId: sub.assignment.id,
    assignmentTitle: sub.assignment.title,
    maxScore: sub.assignment.maxScore,
    fileName: sub.fileName,
    fileSize: sub.fileSize,
    submittedAt: sub.submittedAt.toISOString(),
    status: sub.status as any,
    score: sub.grade?.score,
  }));

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full">
      <GradingQueueClient
        initialItems={items}
        assignmentsList={assignmentsList}
        classList={classList}
      />
    </div>
  );
}
