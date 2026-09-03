import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET, getS3PublicUrl } from "@/lib/s3/client";
import { validateFileMeta, sanitizeFileName } from "@/lib/s3/file-validator";
import { getAuthSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "STUDENT" || !session.studentId) {
      return NextResponse.json(
        { success: false, error: "ไม่มีสิทธิ์ในการอัปโหลดไฟล์ (Unauthorized)" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assignmentId = formData.get("assignmentId") as string | null;

    if (!file || !assignmentId) {
      return NextResponse.json(
        { success: false, error: "กรุณาเลือกไฟล์และระบุงานที่ต้องการส่ง" },
        { status: 400 }
      );
    }

    // ตรวจสอบความถูกต้องของขนาดและประเภทไฟล์ (ไม่เกิน 20MB)
    const validation = validateFileMeta({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const safeName = sanitizeFileName(file.name);
    const uuid = crypto.randomUUID();
    const fileKey = `assignments/${assignmentId}/submissions/${session.studentId}/${uuid}-${safeName}`;

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
