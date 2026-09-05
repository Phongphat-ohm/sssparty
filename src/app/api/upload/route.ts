import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET, getS3PublicUrl } from "@/lib/s3/client";
import { validateFileMeta, sanitizeFileName } from "@/lib/s3/file-validator";
import { getAuthSession } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/logger";
import { getSystemSettings } from "@/lib/settings/system-settings";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "ไม่มีสิทธิ์ในการอัปโหลดไฟล์ (Unauthorized)" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assignmentId = formData.get("assignmentId") as string | null;
    const folder = (formData.get("folder") as string) || "materials";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "กรุณาเลือกไฟล์ที่ต้องการอัปโหลด" },
        { status: 400 }
      );
    }

    // ตรวจสอบขนาดไฟล์สูงสุดจาก System Settings (ไม่ hard-code)
    const settings = await getSystemSettings();
    const maxSizeBytes = (settings.max_upload_size_mb || 50) * 1024 * 1024;

    const validation = validateFileMeta({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      maxSize: maxSizeBytes,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const safeName = sanitizeFileName(file.name);
    const uuid = crypto.randomUUID();

    let fileKey: string;

    if (session.role === "STUDENT") {
      if (!session.studentId || !assignmentId) {
        return NextResponse.json(
          { success: false, error: "กรุณาระบุงานที่ต้องการส่ง" },
          { status: 400 }
        );
      }
      fileKey = `assignments/${assignmentId}/submissions/${session.studentId}/${uuid}-${safeName}`;
    } else if (session.role === "ADMIN") {
      fileKey = `assignments/${folder}/${uuid}-${safeName}`;
    } else {
      return NextResponse.json(
        { success: false, error: "บทบาทของคุณไม่สามารถอัปโหลดไฟล์ได้" },
        { status: 403 }
      );
    }

    // แปลงไฟล์เป็น Buffer แล้วอัปโหลดตรงเข้า S3 ผ่าน PutObjectCommand
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

    // Audit log
    await createAuditLog({
      userId: session.role === "ADMIN" ? session.userId : null,
      username: session.username,
      role: session.role,
      action: "FILE_UPLOAD",
      targetType: "FILE",
      targetId: fileKey,
      details: `${session.role === "STUDENT" ? "นักเรียนอัปโหลดไฟล์ส่งงาน" : "ครูอัปโหลดสื่อการสอน"}: "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
    });

    return NextResponse.json({
      success: true,
      fileKey,
      publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      message: "อัปโหลดไฟล์เข้าสู่ S3 สำเร็จ",
    });
  } catch (error: any) {
    console.error("API /api/upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์" },
      { status: 500 }
    );
  }
}
