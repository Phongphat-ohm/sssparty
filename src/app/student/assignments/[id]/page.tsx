import { redirect, notFound } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { getCurrentSystemTerm } from "@/lib/terms/term-service";
import { StudentAssignmentViewClient } from "@/components/student/StudentAssignmentViewClient";

export default async function StudentAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAuthSession();
  if (!session || session.role !== "STUDENT" || !session.studentId) {
    redirect("/student-login");
  }

  const [resolvedParams, currentTerm] = await Promise.all([
    params,
    getCurrentSystemTerm(),
  ]);
  const assignmentId = resolvedParams.id;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      rubrics: { orderBy: { sortOrder: "asc" } },
      attachments: { orderBy: { createdAt: "asc" } },
      questions: { orderBy: { sortOrder: "asc" } },
      submissions: {
        where: { studentId: session.studentId },
        include: {
          grade: {
            include: { rubricScores: true },
          },
          answers: true,
        },
      },
    },
  });

  if (!assignment || assignment.status === "DRAFT" || assignment.academicTerm !== currentTerm) {
    notFound();
  }

  const submission = assignment.submissions[0] || null;
  const isPastDue = Date.now() > new Date(assignment.dueDate).getTime();

  return (
    <StudentAssignmentViewClient
      assignment={{
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        submissionType: assignment.submissionType,
        status: assignment.status,
        dueDate: assignment.dueDate,
        allowLateSubmission: assignment.allowLateSubmission,
        lateDueDate: assignment.lateDueDate,
        maxScore: assignment.maxScore,
        attachments: assignment.attachments.map((att) => ({
          id: att.id,
          fileName: att.fileName,
          fileKey: att.fileKey,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
        })),
        rubrics: assignment.rubrics.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          maxScore: r.maxScore,
          sortOrder: r.sortOrder,
        })),
        questions: assignment.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          hint: q.hint,
          imageKey: q.imageKey,
          imageUrl: q.imageUrl,
          isRequired: q.isRequired,
          sortOrder: q.sortOrder,
        })),
      }}
      submission={
        submission
          ? {
              id: submission.id,
              submissionType: submission.submissionType,
              fileKey: submission.fileKey,
              fileName: submission.fileName,
              fileSize: submission.fileSize,
              mimeType: submission.mimeType,
              linkUrl: submission.linkUrl,
              comment: submission.comment,
              submittedAt: submission.submittedAt,
              status: submission.status,
              returnReason: submission.returnReason,
              returnedAt: submission.returnedAt,
              grade: submission.grade
                ? {
                    score: submission.grade.score,
                    totalScore: submission.grade.score,
                    feedback: submission.grade.feedback,
                    gradedAt: submission.grade.gradedAt,
                    rubricScores: submission.grade.rubricScores.map((rs) => ({
                      rubricId: rs.rubricId,
                      score: rs.score,
                      note: rs.note,
                    })),
                  }
                : null,
              answers: submission.answers.map((a) => ({
                questionId: a.questionId,
                answerText: a.answerText,
              })),
            }
          : null
      }
      isPastDue={isPastDue}
    />
  );
}
