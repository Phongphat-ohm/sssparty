"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requireAdminPermission } from "@/lib/auth/permissions-server";
import { createAuditLog } from "@/lib/audit/logger";
import { checkTermCanEdit } from "@/lib/terms/term-service";

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
        grade: true,
      },
    });

    if (!submission) {
      return { success: false, message: "ไม่พบข้อมูลชิ้นงานที่ต้องการตรวจ" };
    }

    const termCheck = await checkTermCanEdit(submission.assignment.academicTerm, currentUser);
    if (!termCheck.canEdit) {
      return { success: false, message: termCheck.reason };
    }

    const previousGrade = submission.grade;
    const isUpdate = Boolean(previousGrade);

    // ห้ามให้คะแนนงานที่ยังอยู่ในสถานะแบบร่าง (DRAFT)
    if (submission.status === "DRAFT") {
      return {
        success: false,
        message: "ไม่สามารถให้คะแนนงานที่ยังอยู่ในสถานะแบบร่างได้ (นักเรียนยังไม่ได้กดยืนยันส่งงาน)",
      };
    }

    // ห้ามให้คะแนนงานที่อยู่ในสถานะถูกตีกลับให้แก้ไข (RETURNED)
    if (submission.status === "RETURNED") {
      return {
        success: false,
        message: "ไม่สามารถให้คะแนนงานที่อยู่ในสถานะถูกตีกลับได้ กรุณารอให้นักเรียนส่งงานใหม่อีกครั้ง",
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

    const details = isUpdate
      ? `แก้ไขคะแนนการบ้าน "${submission.assignment.title}" ของ ${submission.student.firstName} ${submission.student.lastName} (${submission.student.className} เลขที่ ${submission.student.studentNumber}) จาก ${previousGrade?.score} เป็น ${totalScore}/${submission.assignment.maxScore} (คะแนนเปลี่ยน: ${totalScore - (previousGrade?.score || 0)} คะแนน)`
      : `ตรวจงานการบ้าน "${submission.assignment.title}" ของ ${submission.student.firstName} ${submission.student.lastName} (${submission.student.className} เลขที่ ${submission.student.studentNumber}) ได้คะแนน ${totalScore}/${submission.assignment.maxScore}`;

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: isUpdate ? "UPDATE_GRADE" : "GRADE_SUBMISSION",
      targetType: "GRADE",
      targetId: submissionId,
      details,
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

export interface ReturnSubmissionResult {
  success: boolean;
  message?: string;
}

/**
 * ตีกลับงานของนักเรียนเพื่อให้แก้ไขและส่งใหม่ (Return for Revision)
 * - เปลี่ยนสถานะ Submission เป็น RETURNED
 * - บันทึก returnReason, returnedAt, returnedById
 * - ลบ/ยกเลิก Grade เดิม (ถ้ามี) เพื่อให้นักเรียนทำมาส่งใหม่
 * - บันทึก Audit Log เหตุการณ์ RETURN_SUBMISSION
 */
export async function returnSubmissionAction(
  submissionId: string,
  returnReason: string
): Promise<ReturnSubmissionResult> {
  try {
    const authCheck = await requireAdminPermission("GRADE_SUBMISSIONS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }

    const { user: currentUser, session } = authCheck;

    if (!submissionId || !submissionId.trim()) {
      return { success: false, message: "รหัสการส่งงานไม่ถูกต้อง" };
    }

    const cleanReason = returnReason?.trim();
    if (!cleanReason || cleanReason.length < 3) {
      return { success: false, message: "กรุณาระบุเหตุผลในการตีกลับงานอย่างน้อย 3 ตัวอักษร" };
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: true,
        assignment: true,
        grade: true,
      },
    });

    if (!submission) {
      return { success: false, message: "ไม่พบข้อมูลชิ้นงานในระบบ" };
    }

    const termCheck = await checkTermCanEdit(submission.assignment.academicTerm, currentUser);
    if (!termCheck.canEdit) {
      return { success: false, message: termCheck.reason };
    }

    if (submission.status === "DRAFT") {
      return {
        success: false,
        message: "งานนี้ยังอยู่ในสถานะแบบร่าง (นักเรียนยังไม่ได้กดยืนยันส่งงาน) ไม่สามารถตีกลับได้",
      };
    }

    const hadPreviousGrade = Boolean(submission.grade);
    const previousScore = submission.grade?.score;

    // ทำรายการใน Transaction
    await prisma.$transaction(async (tx) => {
      // 1. ถ้ามี Grade เดิมอยู่ ให้ลบ rubricScores และ grade ออก
      if (hadPreviousGrade) {
        await tx.rubricScore.deleteMany({
          where: { grade: { submissionId } },
        });
        await tx.grade.delete({
          where: { submissionId },
        });
      }

      // 2. อัปเดตสถานะ Submission เป็น RETURNED
      await tx.submission.update({
        where: { id: submissionId },
        data: {
          status: "RETURNED",
          returnReason: cleanReason,
          returnedAt: new Date(),
          returnedById: session.userId,
        },
      });
    });

    const studentInfo = `${submission.student.firstName} ${submission.student.lastName} (${submission.student.className} เลขที่ ${submission.student.studentNumber})`;

    await createAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      role: "ADMIN",
      action: "RETURN_SUBMISSION",
      targetType: "SUBMISSION",
      targetId: submissionId,
      details: {
        submissionId,
        studentId: submission.studentId,
        studentName: studentInfo,
        assignmentId: submission.assignmentId,
        assignmentTitle: submission.assignment.title,
        returnReason: cleanReason,
        previousScore: hadPreviousGrade ? previousScore : null,
      },
    });

    revalidatePath(`/admin/submissions/${submissionId}`);
    revalidatePath(`/admin/assignments/${submission.assignmentId}/submissions`);
    revalidatePath("/admin/assignments");
    revalidatePath("/admin/dashboard");
    revalidatePath(`/student/assignments/${submission.assignmentId}`);
    revalidatePath("/student/assignments");
    revalidatePath("/student/dashboard");

    return {
      success: true,
      message: `ตีกลับงานของ ${submission.student.firstName} เรียบร้อยแล้ว (นักเรียนสามารถแก้ไขและส่งใหม่ได้)`,
    };
  } catch (error) {
    console.error("returnSubmissionAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการตีกลับงาน กรุณาลองใหม่อีกครั้ง" };
  }
}

