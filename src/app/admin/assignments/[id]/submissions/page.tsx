import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
} from "lucide-react";
import {
  AssignmentSubmissionsClient,
  StudentSubmissionRow,
} from "@/components/admin/AssignmentSubmissionsClient";

export default async function AssignmentSubmissionsPage({
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
      submissions: {
        include: {
          student: true,
          grade: true,
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!assignment) {
    notFound();
  }

  const allStudents = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ className: "asc" }, { studentNumber: "asc" }],
  });

  const submissionsMap = new Map(assignment.submissions.map((s) => [s.studentId, s]));

  const totalSubmitted = assignment.submissions.length;
  const totalGraded = assignment.submissions.filter((s) => s.status === "GRADED").length;
  const totalPending = totalSubmitted - totalGraded;

  const rows: StudentSubmissionRow[] = allStudents.map((s) => {
    const sub = submissionsMap.get(s.id);
    return {
      studentId: s.id,
      studentCode: s.studentCode,
      firstName: s.firstName,
      lastName: s.lastName,
      className: s.className,
      studentNumber: s.studentNumber,
      submissionId: sub?.id,
      fileName: sub?.fileName || undefined,
      submittedAt: sub?.submittedAt?.toISOString(),
      status: sub?.status || "NOT_SUBMITTED",
      score: sub?.grade?.score,
      maxScore: assignment.maxScore,
    };
  });

  const classList = Array.from(new Set(allStudents.map((s) => s.className)));

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-6xl w-full mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/assignments"
            className="p-2 rounded-xl bg-white border border-[#EADBCC] text-[#7A6A5C] hover:text-[#3F342B] transition-colors"
            title="ย้อนกลับ"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C5D23] bg-[#FAF0E1] px-2 py-0.5 rounded-full">
                รายการส่งงาน
              </span>
              <span className="text-xs text-[#7A6A5C]">
                คะแนนเต็ม: {assignment.maxScore} ({assignment.rubrics.length} เกณฑ์)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#3F342B] tracking-tight">
              {assignment.title}
            </h1>
          </div>
        </div>

        <Link
          href={`/admin/assignments/${assignment.id}/edit`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#D9CABB] text-[#5A4D41] hover:border-[#D9A441] transition-all self-start sm:self-auto"
        >
          แก้ไขรายละเอียดงาน
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#EADBCC] shadow-2xs">
          <span className="text-xs text-[#7A6A5C] block">สมาชิกทั้งหมด</span>
          <strong className="text-xl font-bold text-[#3F342B]">{allStudents.length} คน</strong>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#EADBCC] shadow-2xs">
          <span className="text-xs text-[#7A6A5C] block">ส่งผลงานแล้ว</span>
          <strong className="text-xl font-bold text-emerald-700">{totalSubmitted} คน</strong>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#EADBCC] shadow-2xs">
          <span className="text-xs text-[#7A6A5C] block">ตรวจเสร็จแล้ว</span>
          <strong className="text-xl font-bold text-[#B94E48]">{totalGraded} คน</strong>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#EADBCC] shadow-2xs">
          <span className="text-xs text-[#7A6A5C] block">รอการตรวจ</span>
          <strong className="text-xl font-bold text-amber-700">{totalPending} คน</strong>
        </div>
      </div>

      {/* Client Table with Filter, Sort, Pagination, Download ZIP, Export CSV, and Export PDF */}
      <AssignmentSubmissionsClient
        assignmentId={assignment.id}
        assignmentTitle={assignment.title}
        maxScore={assignment.maxScore}
        dueDate={assignment.dueDate.toISOString()}
        rows={rows}
        classList={classList}
      />
    </div>
  );
}
