"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET, getS3PublicUrl } from "@/lib/s3/client";
import { validateFileMeta, sanitizeFileName } from "@/lib/s3/file-validator";
import { getAuthSession } from "@/lib/auth/session";

export interface DirectUploadResult {
  success: boolean;
  fileKey?: string;
  publicUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
}

/**
 * ระบบอัปโหลดแบบ S3 ธรรมดา:
 * รับไฟล์จาก Client ส่งเข้า S3 ผ่าน Server ตรงๆ โดยใช้ PutObjectCommand
 * หมดปัญหา CORS, Preflight, Signature Mismatch 100%
 */
export async function uploadFileToS3Action(
  formData: FormData
): Promise<DirectUploadResult> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "STUDENT" || !session.studentId) {
      return {
        success: false,
        error: "ไม่มีสิทธิ์ในการอัปโหลดไฟล์ (ต้องเป็นนักเรียนที่เข้าสู่ระบบแล้วเท่านั้น)",
      };
    }

    const file = formData.get("file") as File | null;
    const assignmentId = formData.get("assignmentId") as string | null;

    if (!file || !assignmentId) {
      return { success: false, error: "กรุณาเลือกไฟล์และระบุงานที่ต้องการส่ง" };
    }

    // ตรวจสอบขนาดไฟล์ (ไม่เกิน 20MB) และประเภทไฟล์
    const validation = validateFileMeta({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });

    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const safeName = sanitizeFileName(file.name);
    const uuid = crypto.randomUUID();
    const fileKey = `assignments/${assignmentId}/submissions/${session.studentId}/${uuid}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: fileKey,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    const publicUrl = getS3PublicUrl(fileKey);

    return {
      success: true,
      fileKey,
      publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
    };
  } catch (err: any) {
    console.error("uploadFileToS3Action error:", err);
    return {
      success: false,
      error: err.message || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์เข้าสู่ S3",
    };
  }
}

/**
 * Server Action สำหรับครูผู้สอนอัปโหลดไฟล์/รูปภาพประกอบโจทย์ และรูปภาพประกอบข้อคำถาม
 */
export async function uploadTeacherMaterialAction(
  formData: FormData
): Promise<DirectUploadResult> {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return {
        success: false,
        error: "ไม่มีสิทธิ์ในการอัปโหลดไฟล์ (ต้องเป็นคุณครูผู้ดูแลระบบเท่านั้น)",
      };
    }

    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "materials";

    if (!file) {
      return { success: false, error: "กรุณาเลือกไฟล์ที่ต้องการอัปโหลด" };
    }

    const validation = validateFileMeta({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });

    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const safeName = sanitizeFileName(file.name);
    const uuid = crypto.randomUUID();
    const fileKey = `assignments/${folder}/${uuid}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: fileKey,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    const publicUrl = getS3PublicUrl(fileKey);

    return {
      success: true,
      fileKey,
      publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
    };
  } catch (err: any) {
    console.error("uploadTeacherMaterialAction error:", err);
    return {
      success: false,
      error: err.message || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์เข้าสู่ S3",
    };
  }
}

/**
 * ดึง Public URL ของไฟล์เพื่อเปิดดูหรือดาวน์โหลด
 */
export async function requestDownloadUrlAction(fileKey: string) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนเปิดดูไฟล์" };
  }

  const publicUrl = getS3PublicUrl(fileKey);
  return {
    success: true,
    downloadUrl: publicUrl,
  };
}
