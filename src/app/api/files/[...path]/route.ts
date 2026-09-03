import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET } from "@/lib/s3/client";
import { getAuthSession } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนเปิดดูไฟล์ (Unauthorized)" },
        { status: 401 }
      );
    }

    const resolved = await params;
    const fileKey = resolved.path.join("/");

    // 1. ป้องกัน Path Traversal Attack (ห้ามมี .. หรือ \ ใน Object Key)
    if (fileKey.includes("..") || fileKey.includes("\\")) {
      return NextResponse.json(
        { error: "Object Key ไม่ถูกต้อง (Bad Request)" },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบสิทธิ์การเข้าถึง (Ownership Check / IDOR Protection)
    if (session.role === "STUDENT") {
      const parts = fileKey.split("/");
      const isPublicMaterial =
        parts[0] === "assignments" &&
        (parts[1] === "materials" || parts[1] === "questions");

      // โครงสร้างไฟล์ที่ถูกต้อง: assignments/{assignmentId}/submissions/{studentId}/{filename}
      const isOwnedByStudent =
        parts[0] === "assignments" &&
        parts[2] === "submissions" &&
        parts[3] === session.studentId;

      if (!isPublicMaterial && !isOwnedByStudent) {
        return NextResponse.json(
          { error: "ไม่มีสิทธิ์เปิดดูไฟล์ของผู้อื่น (403 Forbidden)" },
          { status: 403 }
        );
      }
    }

    // ดึงไฟล์จาก S3 Bucket ด้วย Server Credentials (หมดปัญหา AccessDenied 100%)
    const s3Res = await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: fileKey,
      })
    );

    if (!s3Res.Body) {
      return NextResponse.json({ error: "ไม่พบไฟล์ในพื้นที่จัดเก็บ" }, { status: 404 });
    }

    const stream = s3Res.Body.transformToWebStream();
    const url = new URL(req.url);
    const isDownload = url.searchParams.get("download") === "1";
    const filename = fileKey.split("/").pop() || "file";

    const headers = new Headers();
    if (s3Res.ContentType) {
      headers.set("Content-Type", s3Res.ContentType);
    } else {
      headers.set("Content-Type", "application/octet-stream");
    }

    if (s3Res.ContentLength) {
      headers.set("Content-Length", s3Res.ContentLength.toString());
    }

    headers.set("Cache-Control", "private, max-age=3600");
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set("Content-Security-Policy", "frame-ancestors 'self'");
    headers.set(
      "Content-Disposition",
      isDownload
        ? `attachment; filename="${encodeURIComponent(filename)}"`
        : "inline"
    );

    return new Response(stream as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("GET /api/files error:", error);
    if (error.name === "NoSuchKey") {
      return NextResponse.json({ error: "ไม่พบไฟล์ที่ระบุ (NoSuchKey)" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงไฟล์จาก Storage" },
      { status: 500 }
    );
  }
}
