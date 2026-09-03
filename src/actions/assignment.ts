"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { getAuthSession } from "@/lib/auth/session";

const rubricItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "กรุณากรอกชื่อเกณฑ์การให้คะแนน"),
  description: z.string().optional(),
  maxScore: z
    .number()
    .positive("คะแนนแต่ละเกณฑ์ต้องมากกว่า 0")
    .max(1000, "คะแนนสูงเกินไป"),
  sortOrder: z.number().int().optional(),
});

const assignmentSchema = z.object({
  title: z.string().min(3, "ชื่อการบ้านต้องมีความยาวอย่างน้อย 3 ตัวอักษร"),
  description: z.string().min(5, "รายละเอียดงานต้องมีความยาวอย่างน้อย 5 ตัวอักษร"),
  maxScore: z.number().positive("คะแนนเต็มต้องมากกว่า 0"),
  dueDate: z.date().refine((d) => d.getTime() > Date.now(), {
    message: "กำหนดส่งต้องเป็นเวลาในอนาคต",
  }),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).default("DRAFT"),
  submissionType: z.enum(["FILE", "LINK", "QUESTIONS"]).default("FILE"),
  rubrics: z.array(rubricItemSchema).min(1, "ต้องมีเกณฑ์การให้คะแนนอย่างน้อย 1 ข้อ"),
});

export interface AssignmentActionResult {
  success: boolean;
  message?: string;
  assignmentId?: string;
}

/**
 * สร้างการบ้านใหม่ พร้อมเกณฑ์ Rubric, ไฟล์แนบโจทย์ และชุดคำถาม (Atomic Transaction)
 */
export async function createAssignmentAction(
  formData: FormData
): Promise<AssignmentActionResult> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "ไม่มีสิทธิ์ในการดำเนินการนี้ (Unauthorized)" };
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const maxScore = parseFloat(formData.get("maxScore") as string);
    const dueDateStr = formData.get("dueDate") as string;
    const status = (formData.get("status") as "DRAFT" | "PUBLISHED" | "CLOSED") || "DRAFT";
    const submissionType =
      (formData.get("submissionType") as "FILE" | "LINK" | "QUESTIONS") || "FILE";
    const rubricsJson = formData.get("rubricsJson") as string;
    const attachmentsJson = formData.get("attachmentsJson") as string;
    const questionsJson = formData.get("questionsJson") as string;

    let parsedRubrics: z.infer<typeof rubricItemSchema>[] = [];
    try {
      parsedRubrics = JSON.parse(rubricsJson || "[]");
    } catch {
      return { success: false, message: "รูปแบบข้อมูลเกณฑ์ Rubric ไม่ถูกต้อง" };
    }

    let parsedAttachments: Array<{
      fileKey: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }> = [];
    try {
      parsedAttachments = JSON.parse(attachmentsJson || "[]");
    } catch {}

    let parsedQuestions: Array<{
      questionText: string;
      hint?: string;
      imageKey?: string;
      imageUrl?: string;
      isRequired?: boolean;
      sortOrder?: number;
    }> = [];
    try {
      parsedQuestions = JSON.parse(questionsJson || "[]");
    } catch {}

    if (submissionType === "QUESTIONS") {
      if (parsedQuestions.length === 0) {
        return { success: false, message: "เมื่อเลือกส่งแบบตอบคำถาม ต้องมีคำถามอย่างน้อย 1 ข้อ" };
      }
      for (let i = 0; i < parsedQuestions.length; i++) {
        if (!parsedQuestions[i].questionText?.trim()) {
          return { success: false, message: `กรุณากรอกข้อความคำถามข้อที่ ${i + 1} ให้เรียบร้อย` };
        }
      }
    }

    const parsed = assignmentSchema.safeParse({
      title,
      description,
      maxScore,
      dueDate: new Date(dueDateStr),
      status,
      submissionType,
      rubrics: parsedRubrics,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "ข้อมูลการบ้านไม่ถูกต้อง",
      };
    }

    const validData = parsed.data;

    // กฎเหล็ก: ผลรวมคะแนน Rubric ต้องเท่ากับ maxScore
    const rubricSum = validData.rubrics.reduce((acc, r) => acc + r.maxScore, 0);
    if (Math.abs(rubricSum - validData.maxScore) > 0.001) {
      return {
        success: false,
        message: `ผลรวมคะแนน Rubric (${rubricSum}) ไม่ตรงกับคะแนนเต็มของงาน (${validData.maxScore})`,
      };
    }

    // บันทึกผ่าน Prisma $transaction
    const assignment = await prisma.$transaction(async (tx) => {
      return tx.assignment.create({
        data: {
          title: validData.title,
          description: validData.description,
          maxScore: validData.maxScore,
          dueDate: validData.dueDate,
          status: validData.status,
          submissionType: validData.submissionType,
          createdById: session.userId,
          rubrics: {
            create: validData.rubrics.map((r, idx) => ({
              name: r.name,
              description: r.description?.trim() || null,
              maxScore: r.maxScore,
              sortOrder: r.sortOrder ?? idx + 1,
            })),
          },
          attachments: {
            create: parsedAttachments.map((a) => ({
              fileKey: a.fileKey,
              fileName: a.fileName,
              fileSize: a.fileSize,
              mimeType: a.mimeType,
            })),
          },
          questions: {
            create: parsedQuestions.map((q, idx) => ({
              questionText: q.questionText.trim(),
              hint: q.hint?.trim() || null,
              imageKey: q.imageKey || null,
              imageUrl: q.imageUrl || null,
              isRequired: q.isRequired ?? true,
              sortOrder: q.sortOrder ?? idx + 1,
            })),
          },
        },
      });
    });

    revalidatePath("/admin/assignments");
    revalidatePath("/admin/dashboard");
    revalidatePath("/student/dashboard");

    return {
      success: true,
      message: "สร้างการบ้านและเกณฑ์ Rubric สำเร็จเรียบร้อย",
      assignmentId: assignment.id,
    };
  } catch (error) {
    console.error("createAssignmentAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการสร้างการบ้าน กรุณาลองใหม่อีกครั้ง" };
  }
}

/**
 * แก้ไขการบ้าน พร้อมตรวจสอบ Rubric Immutability Locking
 */
export async function updateAssignmentAction(
  assignmentId: string,
  formData: FormData
): Promise<AssignmentActionResult> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "ไม่มีสิทธิ์ในการดำเนินการนี้" };
    }

    const existing = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        submissions: { select: { id: true } },
        rubrics: true,
      },
    });

    if (!existing) {
      return { success: false, message: "ไม่พบข้อมูลการบ้านที่ต้องการแก้ไข" };
    }

    const hasSubmissions = existing.submissions.length > 0;

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const dueDateStr = formData.get("dueDate") as string;
    const status = (formData.get("status") as "DRAFT" | "PUBLISHED" | "CLOSED") || existing.status;

    if (!title || !description || !dueDateStr) {
      return { success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" };
    }

    const attachmentsJson = formData.get("attachmentsJson") as string;
    let parsedAttachments: Array<{
      fileKey: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }> = [];
    try {
      parsedAttachments = JSON.parse(attachmentsJson || "[]");
    } catch {}

    // กรณีมีนักเรียนส่งงานแล้ว: Rubric Immutability Locking ห้ามแก้ไข Rubrics หรือ maxScore หรือ questions/submissionType
    if (hasSubmissions) {
      await prisma.$transaction(async (tx) => {
        // อัปเดตข้อมูลทั่วไป
        await tx.assignment.update({
          where: { id: assignmentId },
          data: {
            title,
            description,
            dueDate: new Date(dueDateStr),
            status,
          },
        });

        // อัปเดต attachments
        await tx.assignmentAttachment.deleteMany({
          where: { assignmentId },
        });
        if (parsedAttachments.length > 0) {
          await tx.assignmentAttachment.createMany({
            data: parsedAttachments.map((a) => ({
              assignmentId,
              fileKey: a.fileKey,
              fileName: a.fileName,
              fileSize: a.fileSize,
              mimeType: a.mimeType,
            })),
          });
        }
      });

      revalidatePath("/admin/assignments");
      revalidatePath(`/admin/assignments/${assignmentId}`);
      revalidatePath("/student/dashboard");

      return {
        success: true,
        message: "อัปเดตข้อมูลทั่วไปสำเร็จ (เกณฑ์ Rubric และรูปแบบส่งงานถูกล็อกเนื่องจากมีนักเรียนส่งงานแล้ว)",
        assignmentId,
      };
    }

    // กรณีที่ยังไม่มีใครส่งงาน: อนุญาตให้แก้ไข Rubrics, maxScore, submissionType, questions ได้
    const maxScore = parseFloat(formData.get("maxScore") as string);
    const submissionType =
      (formData.get("submissionType") as "FILE" | "LINK" | "QUESTIONS") || "FILE";
    const rubricsJson = formData.get("rubricsJson") as string;
    const questionsJson = formData.get("questionsJson") as string;

    let parsedRubrics: z.infer<typeof rubricItemSchema>[] = [];
    try {
      parsedRubrics = JSON.parse(rubricsJson || "[]");
    } catch {
      return { success: false, message: "รูปแบบข้อมูลเกณฑ์ Rubric ไม่ถูกต้อง" };
    }

    let parsedQuestions: Array<{
      questionText: string;
      hint?: string;
      imageKey?: string;
      imageUrl?: string;
      isRequired?: boolean;
      sortOrder?: number;
    }> = [];
    try {
      parsedQuestions = JSON.parse(questionsJson || "[]");
    } catch {}

    if (submissionType === "QUESTIONS") {
      if (parsedQuestions.length === 0) {
        return { success: false, message: "เมื่อเลือกส่งแบบตอบคำถาม ต้องมีคำถามอย่างน้อย 1 ข้อ" };
      }
      for (let i = 0; i < parsedQuestions.length; i++) {
        if (!parsedQuestions[i].questionText?.trim()) {
          return { success: false, message: `กรุณากรอกข้อความคำถามข้อที่ ${i + 1} ให้เรียบร้อย` };
        }
      }
    }

    const parsed = assignmentSchema.safeParse({
      title,
      description,
      maxScore,
      dueDate: new Date(dueDateStr),
      status,
      submissionType,
      rubrics: parsedRubrics,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "ข้อมูลการบ้านไม่ถูกต้อง",
      };
    }

    const validData = parsed.data;
    const rubricSum = validData.rubrics.reduce((acc, r) => acc + r.maxScore, 0);
    if (Math.abs(rubricSum - validData.maxScore) > 0.001) {
      return {
        success: false,
        message: `ผลรวมคะแนน Rubric (${rubricSum}) ไม่ตรงกับคะแนนเต็ม (${validData.maxScore})`,
      };
    }

    await prisma.$transaction(async (tx) => {
      // ลบ Rubrics เดิมและสร้างใหม่
      await tx.assignmentRubric.deleteMany({
        where: { assignmentId },
      });

      // ลบ Attachments เดิมและสร้างใหม่
      await tx.assignmentAttachment.deleteMany({
        where: { assignmentId },
      });

      // ลบ Questions เดิมและสร้างใหม่
      await tx.assignmentQuestion.deleteMany({
        where: { assignmentId },
      });

      await tx.assignment.update({
        where: { id: assignmentId },
        data: {
          title: validData.title,
          description: validData.description,
          maxScore: validData.maxScore,
          dueDate: validData.dueDate,
          status: validData.status,
          submissionType: validData.submissionType,
          rubrics: {
            create: validData.rubrics.map((r, idx) => ({
              name: r.name,
              description: r.description?.trim() || null,
              maxScore: r.maxScore,
              sortOrder: r.sortOrder ?? idx + 1,
            })),
          },
          attachments: {
            create: parsedAttachments.map((a) => ({
              fileKey: a.fileKey,
              fileName: a.fileName,
              fileSize: a.fileSize,
              mimeType: a.mimeType,
            })),
          },
          questions: {
            create: parsedQuestions.map((q, idx) => ({
              questionText: q.questionText.trim(),
              hint: q.hint?.trim() || null,
              imageKey: q.imageKey || null,
              imageUrl: q.imageUrl || null,
              isRequired: q.isRequired ?? true,
              sortOrder: q.sortOrder ?? idx + 1,
            })),
          },
        },
      });
    });

    revalidatePath("/admin/assignments");
    revalidatePath(`/admin/assignments/${assignmentId}`);
    revalidatePath("/student/dashboard");

    return {
      success: true,
      message: "อัปเดตข้อมูลการบ้านและเกณฑ์ Rubrics เรียบร้อยแล้ว",
      assignmentId,
    };
  } catch (error) {
    console.error("updateAssignmentAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการอัปเดตการบ้าน" };
  }
}

/**
 * สลับสถานะของงาน (DRAFT, PUBLISHED, CLOSED)
 */
export async function toggleAssignmentStatusAction(
  assignmentId: string,
  newStatus: "DRAFT" | "PUBLISHED" | "CLOSED"
): Promise<AssignmentActionResult> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "ไม่มีสิทธิ์ในการดำเนินการนี้" };
    }

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: newStatus },
    });

    revalidatePath("/admin/assignments");
    revalidatePath("/student/dashboard");

    return { success: true, message: `เปลี่ยนสถานะงานเป็น ${newStatus} สำเร็จ` };
  } catch (error) {
    console.error("toggleAssignmentStatusAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ" };
  }
}

/**
 * ลบการบ้าน (เฉพาะที่ยังไม่มีการส่งงาน)
 */
export async function deleteAssignmentAction(
  assignmentId: string
): Promise<AssignmentActionResult> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "ไม่มีสิทธิ์ในการดำเนินการนี้" };
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { submissions: { select: { id: true } } },
    });

    if (!assignment) {
      return { success: false, message: "ไม่พบการบ้านที่ต้องการลบ" };
    }

    if (assignment.submissions.length > 0) {
      return {
        success: false,
        message: "ไม่สามารถลบการบ้านนี้ได้ เนื่องจากมีนักเรียนส่งงานแล้ว",
      };
    }

    await prisma.assignment.delete({
      where: { id: assignmentId },
    });

    revalidatePath("/admin/assignments");
    revalidatePath("/student/dashboard");

    return { success: true, message: "ลบการบ้านเรียบร้อยแล้ว" };
  } catch (error) {
    console.error("deleteAssignmentAction error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการลบการบ้าน" };
  }
}
