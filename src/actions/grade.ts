"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requireAdminPermission } from "@/lib/auth/permissions-server";
import { createAuditLog } from "@/lib/audit/logger";

export interface RubricScoreInput {
  rubricId: string;
  score: number;
  note?: string;
}

export interface SaveGradeParams {
  submissionId: string;
  rubricScores: RubricScoreInput[];
  feedback?: string;
}

export interface SaveGradeResult {
  success: boolean;
  message?: string;
  totalScore?: number;
}

/**
 * Server Action สำหรับครูบันทึกคะแนนประเมินตามเกณฑ์ Rubrics และคำติชม
 * ปฏิบัติตามมาตรฐาน Prisma $transaction ใน plans.md Phase 9
 */
export async function saveGradeAction(
  params: SaveGradeParams
): Promise<SaveGradeResult> {
  try {
    const authCheck = await requireAdminPermission("GRADE_SUBMISSIONS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }
    const { user: currentUser, session } = authCheck;

    const { submissionId, rubricScores, feedback } = params;

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { rubrics: true },
        },
        student: {
          select: { firstName: true, lastName: true, className: true, studentNumber: true },
        },
      },
    });

    if (!submission) {
      return { success: false, message: "ไม่พบข้อมูลชิ้นงานที่ต้องการตรวจ" };
    }

    // ห้ามให้คะแนนงานที่ยังอยู่ในสถานะแบบร่าง (DRAFT)
    if (submission.status === "DRAFT") {
      return {
        success: false,
        message: "ไม่สามารถให้คะแนนงานที่ยังอยู่ในสถานะแบบร่างได้ (นักเรียนยังไม่ได้กดยืนยันส่งงาน)",
      };
    }

    const assignmentRubrics = submission.assignment.rubrics;
    const rubricsMap = new Map(assignmentRubrics.map((r) => [r.id, r]));

    // 1. ตรวจสอบคะแนนทุกข้อต้องอยู่ในช่วง 0 <= score <= rubric.maxScore (ตามข้อ 3 ใน plans.md)
    for (const rs of rubricScores) {
      const rubricDef = rubricsMap.get(rs.rubricId);
      if (!rubricDef) {
        return { success: false, message: `ไม่พบเกณฑ์การให้คะแนนรหัส: ${rs.rubricId}` };
      }

      if (typeof rs.score !== "number" || isNaN(rs.score)) {
        return { success: false, message: `คะแนนในเกณฑ์ "${rubricDef.name}" ไม่ถูกต้อง` };
      }

      if (rs.score < 0 || rs.score > rubricDef.maxScore) {
        return {
          success: false,
          message: `คะแนนในเกณฑ์ "${rubricDef.name}" ต้องอยู่ในช่วง 0 ถึง ${rubricDef.maxScore} คะแนน`,
        };
      }
    }

    // 2. คำนวณผลรวมคะแนนที่ฝั่ง Server เพื่อความปลอดภัย (Defense-in-Depth)
    const totalScore = rubricScores.reduce((acc, r) => acc + r.score, 0);

    // 3. บันทึกคะแนนด้วย Prisma $transaction อย่างปลอดภัย
    await prisma.$transaction(async (tx) => {
      // 3.1 บันทึกหรืออัปเดตตาราง Grade
      const grade = await tx.grade.upsert({
        where: { submissionId },
        update: {
          score: totalScore,
          feedback: feedback?.trim() || null,
          gradedById: session.userId,
          gradedAt: new Date(),
        },
        create: {
          submissionId,
          score: totalScore,
          feedback: feedback?.trim() || null,
          gradedById: session.userId,
          gradedAt: new Date(),
        },
      });

      // 3.2 ลบ RubricScore เดิมออกก่อนเพื่อรองรับการตรวจแก้ไขคะแนนใหม่
      await tx.rubricScore.deleteMany({
        where: { gradeId: grade.id },
      });

      // 3.3 สร้าง RubricScore ใหม่สำหรับทุกเกณฑ์
      await tx.rubricScore.createMany({
        data: rubricScores.map((rs) => ({
          gradeId: grade.id,
          rubricId: rs.rubricId,
          score: rs.score,
          note: rs.note?.trim() || null,
        })),
      });

      // 3.4 ปรับสถานะของ Submission เป็น GRADED
      await tx.submission.update({
        where: { id: submissionId },
        data: { status: "GRADED" },
      });
    });

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "GRADE_SUBMISSION",
      targetType: "SUBMISSION",
      targetId: submissionId,
      details: `ตรวจงานการบ้าน "${submission.assignment.title}" ของ ${submission.student.firstName} ${submission.student.lastName} (${submission.student.className} เลขที่ ${submission.student.studentNumber}) ได้คะแนน ${totalScore}/${submission.assignment.maxScore}`,
    });

    revalidatePath(`/admin/submissions/${submissionId}`);
    revalidatePath(`/admin/assignments/${submission.assignmentId}/submissions`);
    revalidatePath("/admin/assignments");
    revalidatePath("/admin/dashboard");
    revalidatePath(`/student/assignments/${submission.assignmentId}`);
    revalidatePath("/student/dashboard");

    return {
      success: true,
      message: "บันทึกคะแนนและคำติชมสำเร็จเรียบร้อยแล้ว",
      totalScore,
    };
  } catch (error) {
    console.error("saveGradeAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการบันทึกคะแนน กรุณาลองใหม่อีกครั้ง" };
  }
}
