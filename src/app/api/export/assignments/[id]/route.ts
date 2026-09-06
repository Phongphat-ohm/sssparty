import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getAuthSession } from "@/lib/auth/session";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { generateCsvString, createCsvResponse } from "@/lib/export/csv-helper";
import { createAuditLog } from "@/lib/audit/logger";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบในฐานะผู้ดูแลระบบ (Unauthorized)" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, adminRole: true, permissions: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ error: "บัญชีไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    }

    const canExport =
      hasAdminPermission(user, "GRADE_SUBMISSIONS") ||
      hasAdminPermission(user, "MANAGE_ASSIGNMENTS");

    if (!canExport) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ในการส่งออกข้อมูลคะแนน (Forbidden)" },
        { status: 403 }
      );
    }

    const resolved = await params;
    const assignmentId = resolved.id;
    const { searchParams } = new URL(req.url);
    const filterClass = searchParams.get("className") || "ALL";

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        submissions: {
          include: {
            student: true,
            grade: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "ไม่พบการบ้านที่ต้องการ" }, { status: 404 });
    }

    const studentWhere: any = { status: "ACTIVE" };
    if (filterClass !== "ALL") {
      studentWhere.className = filterClass;
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      orderBy: [{ className: "asc" }, { studentNumber: "asc" }],
    });

    const submissionsMap = new Map(
      assignment.submissions.map((s) => [s.studentId, s])
    );

    const headers = [
      "เลขที่",
      "รหัสนักเรียน",
      "ชื่อ-นามสกุล",
      "ห้อง",
      "สถานะการส่ง",
      "วันเวลาที่ส่ง",
      "คะแนนที่ได้",
      "คะแนนเต็ม",
      "ร้อยละ (%)",
      "ข้อคิดเห็น/คำแนะนำของคุณครู",
    ];

    const rows: (string | number | null | undefined)[][] = [headers];

    for (const student of students) {
      const sub = submissionsMap.get(student.id);

      let statusText = "ยังไม่ส่งงาน";
      let submittedDateStr = "-";
      let scoreText: string | number = "-";
      let percentageText: string | number = "-";
      let feedbackText = "-";

      if (sub) {
        if (sub.status === "GRADED") statusText = "ตรวจแล้ว";
        else if (sub.status === "SUBMITTED") statusText = "ส่งแล้ว (รอตรวจ)";
        else if (sub.status === "LATE") statusText = "ส่งช้ากว่ากำหนด";
        else if (sub.status === "DRAFT") statusText = "แบบร่าง";

        if (sub.submittedAt) {
          const d = new Date(sub.submittedAt);
          submittedDateStr =
            d.toLocaleDateString("th-TH") + " " + d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
        }

        if (sub.grade) {
          scoreText = sub.grade.score;
          percentageText =
            assignment.maxScore > 0
              ? ((sub.grade.score / assignment.maxScore) * 100).toFixed(2) + "%"
              : "-";
          feedbackText = sub.grade.feedback || "-";
        }
      }

      rows.push([
        student.studentNumber,
        student.studentCode,
        `${student.firstName} ${student.lastName}`,
        student.className,
        statusText,
        submittedDateStr,
        scoreText,
        assignment.maxScore,
        percentageText,
        feedbackText,
      ]);
    }

    const csvContent = generateCsvString(rows);

    const cleanTitle = assignment.title.replace(/[^a-zA-Z0-9ก-๙_-]/g, "_");
    const classSuffix = filterClass !== "ALL" ? `_ห้อง_${filterClass}` : "";
    const filename = `คะแนน_${cleanTitle}${classSuffix}.csv`;

    await createAuditLog({
      username: session.username,
      role: "ADMIN",
      action: "SETTINGS_UPDATE",
      targetType: "ASSIGNMENT",
      targetId: assignment.id,
      details: `ส่งออกไฟล์คะแนนการบ้าน "${assignment.title}" เป็น CSV (${students.length} รายการ)`,
    });

    return createCsvResponse(csvContent, filename);
  } catch (error: any) {
    console.error("Export assignment error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการส่งออกข้อมูลคะแนน" },
      { status: 500 }
    );
  }
}
