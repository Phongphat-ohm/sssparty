import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET } from "./client";
import { validateFileMeta, sanitizeFileName } from "./file-validator";
import { prisma } from "@/lib/prisma/client";

export interface CreateUploadUrlParams {
  assignmentId: string;
  studentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface CreateUploadUrlResult {
  success: boolean;
  uploadUrl?: string;
  fileKey?: string;
  error?: string;
}

export interface CreateDownloadUrlParams {
  fileKey: string;
  requestedBy: {
    userId: string;
    role: "ADMIN" | "STUDENT";
    studentId?: string;
  };
}

export interface CreateDownloadUrlResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  statusCode?: number;
}

/**
 * ออก Presigned PUT URL อายุ 5 นาที (300 วินาที)
 * สร้าง Server-controlled Object Key ตามรูปแบบ:
 * assignments/{assignmentId}/submissions/{studentId}/{uuid}-{filename}
 */
export async function createUploadPresignedUrl(
  params: CreateUploadUrlParams
): Promise<CreateUploadUrlResult> {
  const { assignmentId, studentId, fileName, fileSize, mimeType } = params;

  // 1. ตรวจสอบเงื่อนไขไฟล์ผ่าน File Validation Layer
  const validation = validateFileMeta({ fileName, fileSize, mimeType });
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  // 2. สร้าง Object Key อัตโนมัติจากฝั่ง Server
  const safeFileName = sanitizeFileName(fileName);
  const uuid = crypto.randomUUID();
  const fileKey = `assignments/${assignmentId}/submissions/${studentId}/${uuid}-${safeFileName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileKey,
      ContentType: mimeType,
    });

    // อายุของ Presigned PUT URL = 5 นาที (300 วินาที) ตาม plans.md
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
    });

    return {
      success: true,
      uploadUrl,
      fileKey,
    };
  } catch (error) {
    console.error("createUploadPresignedUrl error:", error);
    return {
      success: false,
      error: "ไม่สามารถสร้าง URL สำหรับอัปโหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง",
    };
  }
}

/**
 * ออก Presigned GET URL อายุ 15 นาที (900 วินาที)
 * พร้อมระบบ Ownership Authorization Check ตามข้อ 3 ใน plans.md:
 * - ครู/Admin: ดูได้ทุกไฟล์
 * - นักเรียน: ดูได้เฉพาะไฟล์ที่เป็น studentId ของตนเองเท่านั้น (หากไม่ใช่ คืน 403 Forbidden)
 */
export async function createDownloadPresignedUrl(
  params: CreateDownloadUrlParams
): Promise<CreateDownloadUrlResult> {
  const { fileKey, requestedBy } = params;

  if (!fileKey) {
    return { success: false, error: "ไม่พบรหัสอ้างอิงไฟล์ (fileKey)", statusCode: 400 };
  }

  // Ownership Authorization Check
  if (requestedBy.role === "STUDENT") {
    if (!requestedBy.studentId) {
      return {
        success: false,
        error: "ปฏิเสธการเข้าถึง: ไม่พบข้อมูลนักเรียนผู้ร้องขอ (403 Forbidden)",
        statusCode: 403,
      };
    }

    // ตรวจสอบกับฐานข้อมูลว่าชิ้นงานนี้เป็นของนักเรียนคนนี้จริงหรือไม่
    const submission = await prisma.submission.findFirst({
      where: { fileKey },
      select: { studentId: true },
    });

    // หากพบในฐานข้อมูลและ studentId ไม่ตรงกัน หรือ Object Key ระบุ studentId อื่น
    const keyParts = fileKey.split("/");
    const keyStudentId = keyParts.length >= 4 ? keyParts[3] : null;

    const isOwner =
      (submission && submission.studentId === requestedBy.studentId) ||
      (keyStudentId && keyStudentId === requestedBy.studentId);

    if (!isOwner) {
      return {
        success: false,
        error: "ปฏิเสธการเข้าถึง: คุณไม่มีสิทธิ์เปิดดูไฟล์งานของผู้อื่น (403 Forbidden)",
        statusCode: 403,
      };
    }
  }

  // ครู/Admin ผ่านการตรวจสอบโดยอัตโนมัติ
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileKey,
    });

    // อายุของ Presigned GET URL = 15 นาที (900 วินาที) ตาม plans.md
    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 900,
    });

    return {
      success: true,
      downloadUrl,
    };
  } catch (error) {
    console.error("createDownloadPresignedUrl error:", error);
    return {
      success: false,
      error: "ไม่สามารถสร้าง URL สำหรับเปิดดูไฟล์ได้",
      statusCode: 500,
    };
  }
}
