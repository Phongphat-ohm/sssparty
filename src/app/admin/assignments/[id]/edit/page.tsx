import { redirect, notFound } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { EditAssignmentForm } from "@/components/admin/EditAssignmentForm";

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const resolvedParams = await params;
  const assignmentId = resolvedParams.id;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      rubrics: { orderBy: { sortOrder: "asc" } },
      submissions: { select: { id: true } },
      attachments: { orderBy: { createdAt: "asc" } },
      questions: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!assignment) {
    notFound();
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl w-full mx-auto">
      <EditAssignmentForm
        assignment={{
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          maxScore: assignment.maxScore,
          dueDate: assignment.dueDate,
          status: assignment.status,
          submissionType: assignment.submissionType,
          rubrics: assignment.rubrics.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description || undefined,
            maxScore: r.maxScore,
            sortOrder: r.sortOrder,
          })),
          attachments: assignment.attachments.map((a) => ({
            id: a.id,
            fileKey: a.fileKey,
            fileName: a.fileName,
            fileSize: a.fileSize,
            mimeType: a.mimeType,
            publicUrl: `/api/files/${a.fileKey}`,
          })),
          questions: assignment.questions.map((q) => ({
            id: q.id,
            questionText: q.questionText,
            hint: q.hint || undefined,
            imageKey: q.imageKey || undefined,
            imageUrl: q.imageUrl || (q.imageKey ? `/api/files/${q.imageKey}` : undefined),
            isRequired: q.isRequired,
            sortOrder: q.sortOrder,
          })),
          submissionsCount: assignment.submissions.length,
        }}
      />
    </div>
  );
}
