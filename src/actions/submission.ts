"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { getAuthSession } from "@/lib/auth/session";

export interface QuestionAnswerInput {
  questionId: string;
  answerText: string;
}

export interface SubmitAssignmentParams {
  assignmentId: string;
  submissionType?: "FILE" | "LINK" | "QUESTIONS";
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  linkUrl?: string;
  answers?: QuestionAnswerInput[];
  comment?: string;
  isDraft?: boolean;
}

export interface SubmitActionResult {
  success: boolean;
  message?: string;
  submissionId?: string;
  status?: "DRAFT" | "SUBMITTED" | "LATE";
}

/**
 * Server Action บันทึกการส่งงานของนักเรียน (รองรับแบบร่าง และส่งงาน 3 รูปแบบ)
 */
export async function submitAssignmentAction(
  params: SubmitAssignmentParams
): Promise<SubmitActionResult> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "STUDENT" || !session.studentId) {
      return { success: false, message: "ไม่มีสิทธิ์ในการส่งงาน (ต้องเป็นนักเรียนที่เข้าสู่ระบบแล้วเท่านั้น)" };
    }

    const studentId: string = session.studentId;

    const {
      assignmentId,
      submissionType = "FILE",
      fileKey,
      fileName,
      fileSize,
      mimeType,
      linkUrl,
      answers,
      comment,
      isDraft = false,
    } = params;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        submissions: {
          where: { studentId: session.studentId },
          select: { id: true, status: true },
        },
      },
    });

    if (!assignment) {
      return { success: false, message: "ไม่พบการบ้านที่ระบุในระบบ" };
    }

    if (assignment.status === "DRAFT") {
      return { success: false, message: "การบ้านนี้ยังไม่เปิดรับส่งงาน" };
    }

    if (assignment.status === "CLOSED") {
      return { success: false, message: "การบ้านนี้ปิดรับการส่งงานแล้ว" };
    }

    // หากตรวจให้คะแนนไปแล้ว ห้ามส่งทับ
    const existingSubmission = assignment.submissions[0];
    if (existingSubmission && existingSubmission.status === "GRADED") {
      return {
        success: false,
        message: "การบ้านนี้ได้รับการตรวจให้คะแนนแล้ว ไม่สามารถส่งซ้ำได้",
      };
    }

    const now = new Date();

    // กรณีเป็น "แบบร่าง (DRAFT)"
    if (isDraft) {
      const submission = await prisma.$transaction(async (tx) => {
        const sub = await tx.submission.upsert({
          where: {
            assignmentId_studentId: {
              assignmentId,
              studentId,
            },
          },
          update: {
            submissionType,
            fileKey: fileKey || null,
            fileName: fileName || null,
            fileSize: fileSize || null,
            mimeType: mimeType || null,
            linkUrl: linkUrl?.trim() || null,
            comment: comment?.trim() || null,
            submittedAt: now,
            status: "DRAFT",
          },
          create: {
            assignmentId,
            studentId,
            submissionType,
            fileKey: fileKey || null,
            fileName: fileName || null,
            fileSize: fileSize || null,
            mimeType: mimeType || null,
            linkUrl: linkUrl?.trim() || null,
            comment: comment?.trim() || null,
            submittedAt: now,
            status: "DRAFT",
          },
        });

        // จัดการ answers สำหรับแบบร่าง
        if (answers && answers.length > 0) {
          await tx.questionAnswer.deleteMany({
            where: { submissionId: sub.id },
          });

          const validAnswers = answers
            .filter((a) => a.answerText && a.answerText.trim().length > 0)
            .map((a) => ({
              submissionId: sub.id,
              questionId: a.questionId,
              answerText: a.answerText.trim(),
            }));

          if (validAnswers.length > 0) {
            await tx.questionAnswer.createMany({
              data: validAnswers,
            });
          }
        }

        return sub;
      });

      revalidatePath("/student/assignments");
      revalidatePath(`/student/assignments/${assignmentId}`);
      revalidatePath("/student/dashboard");
      revalidatePath(`/admin/assignments/${assignmentId}/submissions`);
      revalidatePath("/admin/submissions");
      revalidatePath("/admin/dashboard");

      return {
        success: true,
        message: "บันทึกแบบร่างเรียบร้อยแล้ว (คุณสามารถกลับมาแก้ไขต่อหรือกดยืนยันส่งงานได้ตลอดเวลา)",
        submissionId: submission.id,
        status: "DRAFT",
      };
    }

    // กรณี "ยืนยันส่งงานอย่างเป็นทางการ (Turn In)"
    // 1. ตรวจสอบความครบถ้วนตามประเภทงาน
    if (assignment.submissionType === "FILE" && !fileKey) {
      return { success: false, message: "กรุณาเลือกไฟล์ผลงานก่อนกดยืนยันส่งงาน" };
    }

    if (assignment.submissionType === "LINK") {
      const cleanUrl = linkUrl?.trim() || "";
      if (!cleanUrl || (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://"))) {
        return { success: false, message: "กรุณากรอกลิงก์ผลงานที่ถูกต้อง (ขึ้นต้นด้วย https:// หรือ http://)" };
      }
    }

    if (assignment.submissionType === "QUESTIONS") {
      const answersMap = new Map((answers || []).map((a) => [a.questionId, a.answerText.trim()]));
      for (let i = 0; i < assignment.questions.length; i++) {
        const q = assignment.questions[i];
        if (q.isRequired) {
          const ans = answersMap.get(q.id);
          if (!ans || ans.length === 0) {
            return {
              success: false,
              message: `กรุณาตอบคำถามข้อที่ ${i + 1} ให้เรียบร้อยก่อนกดยืนยันส่งงาน`,
            };
          }
        }
      }
    }

    // 2. ตรวจสอบ Deadline:
    // ถ้า submittedAt <= dueDate -> สถานะ SUBMITTED
    // ถ้า submittedAt > dueDate -> สถานะ LATE
    const isLate = now.getTime() > new Date(assignment.dueDate).getTime();
    const submissionStatus: "SUBMITTED" | "LATE" = isLate ? "LATE" : "SUBMITTED";

    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.submission.upsert({
        where: {
          assignmentId_studentId: {
            assignmentId,
            studentId,
          },
        },
        update: {
          submissionType: assignment.submissionType,
          fileKey: fileKey || null,
          fileName: fileName || null,
          fileSize: fileSize || null,
          mimeType: mimeType || null,
          linkUrl: linkUrl?.trim() || null,
          comment: comment?.trim() || null,
          submittedAt: now,
          status: submissionStatus,
        },
        create: {
          assignmentId,
          studentId,
          submissionType: assignment.submissionType,
          fileKey: fileKey || null,
          fileName: fileName || null,
          fileSize: fileSize || null,
          mimeType: mimeType || null,
          linkUrl: linkUrl?.trim() || null,
          comment: comment?.trim() || null,
          submittedAt: now,
          status: submissionStatus,
        },
      });

      // บันทึกคำตอบ
      if (answers && answers.length > 0) {
        await tx.questionAnswer.deleteMany({
          where: { submissionId: sub.id },
        });

        const validAnswers = answers
          .filter((a) => a.answerText && a.answerText.trim().length > 0)
          .map((a) => ({
            submissionId: sub.id,
            questionId: a.questionId,
            answerText: a.answerText.trim(),
          }));

        if (validAnswers.length > 0) {
          await tx.questionAnswer.createMany({
            data: validAnswers,
          });
        }
      }

      return sub;
    });

    revalidatePath("/student/assignments");
    revalidatePath(`/student/assignments/${assignmentId}`);
    revalidatePath("/student/dashboard");
    revalidatePath(`/admin/assignments/${assignmentId}/submissions`);
    revalidatePath("/admin/submissions");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: isLate ? "ส่งงานสำเร็จ (ส่งช้ากว่ากำหนดเวลา)" : "ส่งงานสำเร็จเรียบร้อยแล้ว",
      submissionId: submission.id,
      status: submissionStatus,
    };
  } catch (error) {
    console.error("submitAssignmentAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการส่งงาน กรุณาลองใหม่อีกครั้ง" };
  }
}
