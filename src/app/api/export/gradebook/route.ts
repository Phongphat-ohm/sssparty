import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getAuthSession } from "@/lib/auth/session";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { generateCsvString, createCsvResponse } from "@/lib/export/csv-helper";
import { createAuditLog } from "@/lib/audit/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
        { error: "คุณไม่มีสิทธิ์ในการส่งออกข้อมูลสมุดคะแนน (Forbidden)" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filterClass = searchParams.get("className") || "ALL";

    // ดึงการบ้านที่เผยแพร่ทั้งหมด
    const assignments = await prisma.assignment.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      include: {
        submissions: {
          include: {
            grade: true,
          },
        },
      },
    });

    const studentWhere: any = { status: "ACTIVE" };
    if (filterClass !== "ALL") {
      studentWhere.className = filterClass;
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      orderBy: [{ className: "asc" }, { studentNumber: "asc" }],
    });

    let totalMaxPossibleScore = 0;
    for (const a of assignments) {
      totalMaxPossibleScore += a.maxScore;
    }

    // สร้าง Header: ข้อมูลนักเรียน + ชื่องานแต่ละชิ้น + รวม
    const headers: string[] = [
      "เลขที่",
      "รหัสนักเรียน",
      "ชื่อ-นามสกุล",
      "ห้อง",
      ...assignments.map((a) => `${a.title} (${a.maxScore} คะแนน)`),
      `คะแนนรวม (${totalMaxPossibleScore})`,
      "ร้อยละรวม (%)",
    ];

    const rows: (string | number | null | undefined)[][] = [headers];

    // สร้าง Map เพื่อคำนวณคะแนนเฉลี่ยแต่ละชิ้นงาน
    const assignmentScoresSum: number[] = new Array(assignments.length).fill(0);
    const assignmentScoresCount: number[] = new Array(assignments.length).fill(0);
    let allStudentsTotalSum = 0;

    for (const student of students) {
      let studentTotalScore = 0;
      const studentAssignmentScores: (string | number)[] = [];

      for (let i = 0; i < assignments.length; i++) {
        const a = assignments[i];
        const sub = a.submissions.find((s) => s.studentId === student.id);
        if (sub && sub.grade && typeof sub.grade.score === "number") {
          const score = sub.grade.score;
          studentAssignmentScores.push(score);
          studentTotalScore += score;
          assignmentScoresSum[i] += score;
          assignmentScoresCount[i] += 1;
        } else {
          studentAssignmentScores.push(sub ? "รอตรวจ" : "0");
        }
      }

      allStudentsTotalSum += studentTotalScore;
      const totalPercentage =
        totalMaxPossibleScore > 0
          ? ((studentTotalScore / totalMaxPossibleScore) * 100).toFixed(2) + "%"
          : "-";

      rows.push([
        student.studentNumber,
        student.studentCode,
        `${student.firstName} ${student.lastName}`,
        student.className,
        ...studentAssignmentScores,
        studentTotalScore,
        totalPercentage,
      ]);
    }

    // แถวสรุป: ค่าเฉลี่ยของนักเรียน
    if (students.length > 0) {
      const avgRow: (string | number)[] = [
        "-",
        "-",
        "คะแนนเฉลี่ยของทั้งห้อง",
        filterClass !== "ALL" ? filterClass : "ทุกห้อง",
        ...assignments.map((_, i) => {
          const count = assignmentScoresCount[i];
          return count > 0 ? (assignmentScoresSum[i] / count).toFixed(2) : "-";
        }),
        (allStudentsTotalSum / students.length).toFixed(2),
        totalMaxPossibleScore > 0
          ? (((allStudentsTotalSum / students.length) / totalMaxPossibleScore) * 100).toFixed(2) + "%"
          : "-",
      ];
      rows.push(avgRow);
    }

    const csvContent = generateCsvString(rows);
    const classSuffix = filterClass !== "ALL" ? `_ห้อง_${filterClass}` : "_ทุกห้อง";
    const filename = `สมุดคะแนนรวม${classSuffix}.csv`;

    await createAuditLog({
      username: session.username,
      role: "ADMIN",
      action: "SETTINGS_UPDATE",
      targetType: "ASSIGNMENT",
      details: `ส่งออกสมุดคะแนนรวมทุกการบ้านเป็น CSV (${students.length} คน, ${assignments.length} ชิ้นงาน)`,
    });

    return createCsvResponse(csvContent, filename);
  } catch (error: any) {
    console.error("Export gradebook error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการส่งออกสมุดคะแนนรวม" },
      { status: 500 }
    );
  }
}
