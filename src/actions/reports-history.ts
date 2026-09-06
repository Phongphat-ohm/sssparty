"use server";

import { prisma } from "@/lib/prisma/client";
import { requireAdminPermission } from "@/lib/auth/permissions-server";
import { revalidatePath } from "next/cache";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSystemSetting } from "@/lib/settings/system-settings";

export interface GeneratedReportItem {
  id: string;
  reportCode: string;
  reportType: string;
  title: string;
  academicTerm: string;
  targetClass: string;
  assignmentId: string | null;
  fileKey: string;
  fileUrl: string;
  fileSize: number | null;
  printedById: string;
  printedByName: string;
  createdAt: string;
}

export interface GetGeneratedReportsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  targetClass?: string;
  reportType?: string;
}

export async function getGeneratedReportsAction(params: GetGeneratedReportsParams = {}) {
  try {
    const authCheck = await requireAdminPermission("VIEW_REPORTS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize || 15));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { reportCode: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { printedByName: { contains: q, mode: "insensitive" } },
      ];
    }

    if (params.targetClass && params.targetClass !== "ALL") {
      where.targetClass = params.targetClass;
    }

    if (params.reportType && params.reportType !== "ALL") {
      where.reportType = params.reportType;
    }

    const [totalItems, reports] = await Promise.all([
      prisma.generatedReport.count({ where }),
      prisma.generatedReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    const items: GeneratedReportItem[] = reports.map((r) => ({
      id: r.id,
      reportCode: r.reportCode,
      reportType: r.reportType,
      title: r.title,
      academicTerm: r.academicTerm,
      targetClass: r.targetClass,
      assignmentId: r.assignmentId,
      fileKey: r.fileKey,
      fileUrl: r.fileUrl,
      fileSize: r.fileSize,
      printedById: r.printedById,
      printedByName: r.printedByName,
      createdAt: r.createdAt.toISOString(),
    }));

    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    return {
      success: true,
      data: {
        items,
        totalItems,
        totalPages,
        page,
        pageSize,
      },
    };
  } catch (error: any) {
    console.error("getGeneratedReportsAction error:", error);
    return {
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการดึงประวัติการออกรายงาน",
    };
  }
}

export async function deleteGeneratedReportAction(id: string) {
  try {
    const authCheck = await requireAdminPermission("VIEW_REPORTS");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }

    const report = await prisma.generatedReport.findUnique({
      where: { id },
    });

    if (!report) {
      return { success: false, message: "ไม่พบประวัติรายงานที่ต้องการลบ" };
    }

    // Attempt to delete from S3 if fileKey exists
    if (report.fileKey && process.env.S3_BUCKET_NAME) {
      try {
        const s3Client = new S3Client({
          region: process.env.S3_REGION || "auto",
          endpoint: process.env.S3_ENDPOINT,
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
          },
          forcePathStyle: true,
        });

        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: report.fileKey,
          })
        );
      } catch (s3Err) {
        console.warn("Failed to delete S3 report file, continuing DB deletion:", s3Err);
      }
    }

    await prisma.generatedReport.delete({
      where: { id },
    });

    revalidatePath("/admin/reports");

    return {
      success: true,
      message: "ลบประวัติรายงานเรียบร้อยแล้ว",
    };
  } catch (error: any) {
    console.error("deleteGeneratedReportAction error:", error);
    return {
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการลบประวัติรายงาน",
    };
  }
}

/**
 * คำนวณรหัสเอกสารอัตโนมัติลำดับถัดไปตามปีการศึกษา เช่น DOC-3S-2569-0001
 * โดยนับต่อกันตามจำนวนรายงานในระบบ (0001, 0002, 0003...) และตรวจสอบไม่ให้ซ้ำ
 */
export async function getNextReportCode(academicTerm?: string): Promise<string> {
  try {
    const term = academicTerm || (await getSystemSetting("academic_term")) || "1/2569";
    const yearMatch = term.match(/\d{4}/);
    const termYear = yearMatch ? yearMatch[0] : "2569";
    const prefix = `DOC-3S-${termYear}-`;

    // ค้นหารายการที่มี prefix นี้ทั้งหมดเพื่อหาค่าเลขลำดับสูงสุด
    const reportsWithPrefix = await prisma.generatedReport.findMany({
      where: {
        reportCode: { startsWith: prefix },
      },
      select: { reportCode: true },
    });

    let maxSeq = 0;
    for (const r of reportsWithPrefix) {
      const suffix = r.reportCode.substring(prefix.length);
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }

    if (maxSeq === 0 && reportsWithPrefix.length > 0) {
      maxSeq = reportsWithPrefix.length;
    }

    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    // ตรวจสอบความปลอดภัย ป้องกันรหัสซ้ำ (Unique check)
    let attempts = 0;
    while (await prisma.generatedReport.findUnique({ where: { reportCode: candidate } })) {
      nextSeq++;
      candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;
      attempts++;
      if (attempts > 100) break;
    }

    return candidate;
  } catch (error) {
    console.error("getNextReportCode error:", error);
    return "DOC-3S-2569-0001";
  }
}

/**
 * Server Action สำหรับให้ Client เรียกขอรหัสเอกสารอัตโนมัติลำดับถัดไป
 */
export async function getNextReportCodeAction(academicTerm?: string) {
  try {
    const code = await getNextReportCode(academicTerm);
    return { success: true, code };
  } catch (error: any) {
    console.error("getNextReportCodeAction error:", error);
    return { success: false, code: "DOC-3S-2569-0001", message: error.message };
  }
}

