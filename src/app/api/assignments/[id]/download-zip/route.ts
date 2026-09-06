import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma/client";
import { s3Client, S3_BUCKET } from "@/lib/s3/client";
import { getAuthSession } from "@/lib/auth/session";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { createAuditLog } from "@/lib/audit/logger";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบในฐานะผู้ดูแลระบบ (Unauthorized)" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, adminRole: true, permissions: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ error: "บัญชีไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    }

    const canDownload =
      hasAdminPermission(user, "GRADE_SUBMISSIONS") ||
      hasAdminPermission(user, "MANAGE_ASSIGNMENTS");

    if (!canDownload) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ในการดาวน์โหลดไฟล์งานทั้งหมด (Forbidden)" },
        { status: 403 }
      );
    }

    const resolved = await params;
    const assignmentId = resolved.id;
    const { searchParams } = new URL(req.url);
    const filterClass = searchParams.get("className") || "ALL";

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        submissions: {
          include: {
            student: true,
            grade: true,
            answers: {
              include: { question: true },
            },
          },
          orderBy: { submittedAt: "asc" },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "ไม่พบการบ้านที่ระบุ" }, { status: 404 });
    }

    let submissions = assignment.submissions;
    if (filterClass !== "ALL") {
      submissions = submissions.filter((s) => s.student.className === filterClass);
    }

    if (submissions.length === 0) {
      return NextResponse.json(
        { error: "ไม่มีรายการส่งงานสำหรับเงื่อนไขที่เลือก" },
        { status: 400 }
      );
    }

    const zip = new JSZip();
    let fileCount = 0;

    for (const sub of submissions) {
      const student = sub.student;
      const classFolder = student.className.replace(/[\/\\:*?"<>|]/g, "-");
      const padNum = String(student.studentNumber).padStart(2, "0");
      const cleanStudentName = `${student.firstName}_${student.lastName}`.replace(/[\/\\:*?"<>|]/g, "_");
      const filePrefix = `${padNum}_${student.studentCode}_${cleanStudentName}`;

      const folder = zip.folder(classFolder) || zip;

      // 1. ดาวน์โหลดไฟล์หลักจาก S3
      if (sub.fileKey) {
        try {
          const s3Res = await s3Client.send(
            new GetObjectCommand({
              Bucket: S3_BUCKET,
              Key: sub.fileKey,
            })
          );

          if (s3Res.Body) {
            // ใช้ transformToByteArray จาก AWS SDK v3
            const fileBytes = await s3Res.Body.transformToByteArray();
            const originalFileName = sub.fileName
              ? sub.fileName.replace(/[\/\\:*?"<>|]/g, "_")
              : "submission_file";
            const targetFileName = `${filePrefix}_${originalFileName}`;

            folder.file(targetFileName, fileBytes);
            fileCount++;
          }
        } catch (s3Err) {
          console.warn(`Failed to fetch S3 file for student ${student.studentCode}:`, s3Err);
          folder.file(`${filePrefix}_ERROR_FILE_NOT_FOUND.txt`, `ไม่สามารถดึงไฟล์จาก S3 ได้ (Key: ${sub.fileKey})`);
        }
      }

      // 2. จัดการกรณีมีลิงก์หรือข้อความคำตอบ
      const hasLink = Boolean(sub.linkUrl);
      const hasComment = Boolean(sub.comment);
      const hasAnswers = sub.answers && sub.answers.length > 0;

      if (hasLink || hasComment || hasAnswers) {
        const textParts: string[] = [
          `=========================================`,
          `ข้อมูลการส่งงาน: ${assignment.title}`,
          `นักเรียน: ${student.firstName} ${student.lastName} (ห้อง ${student.className} เลขที่ ${student.studentNumber})`,
          `รหัสนักเรียน: ${student.studentCode}`,
          `เวลาที่ส่ง: ${new Date(sub.submittedAt).toLocaleString("th-TH")}`,
          `=========================================\n`,
        ];

        if (sub.linkUrl) {
          textParts.push(`[แนบลิงก์ผลงาน]`);
          textParts.push(`${sub.linkUrl}\n`);
        }

        if (sub.comment) {
          textParts.push(`[ข้อความเพิ่มเติมจากนักเรียน]`);
          textParts.push(`${sub.comment}\n`);
        }

        if (hasAnswers) {
          textParts.push(`[คำตอบแบบสอบถาม/คำถามเพิ่มเติม]`);
          for (const ans of sub.answers) {
            textParts.push(`คำถาม: ${ans.question.questionText}`);
            textParts.push(`คำตอบ: ${ans.answerText}\n`);
          }
        }

        folder.file(`${filePrefix}_ข้อมูลและลิงก์.txt`, textParts.join("\n"));
        fileCount++;
      }
    }

    if (fileCount === 0) {
      return NextResponse.json(
        { error: "ไม่พบไฟล์ที่ต้องบีบอัดสำหรับการบ้านนี้" },
        { status: 400 }
      );
    }

    // สร้างไฟล์ ZIP ในหน่วยความจำ (Buffer)
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const cleanTitle = assignment.title.replace(/[^a-zA-Z0-9ก-๙_-]/g, "_");
    const classSuffix = filterClass !== "ALL" ? `_ห้อง_${filterClass}` : "";
    const zipFilename = `งานส่ง_${cleanTitle}${classSuffix}.zip`;
    const encodedFilename = encodeURIComponent(zipFilename);

    await createAuditLog({
      username: session.username,
      role: "ADMIN",
      action: "SETTINGS_UPDATE",
      targetType: "ASSIGNMENT",
      targetId: assignment.id,
      details: `ดาวน์โหลดไฟล์ส่งงานทั้งหมดของการบ้าน "${assignment.title}" เป็น ZIP (${fileCount} รายการ)`,
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Download ZIP error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสร้างไฟล์ ZIP สำหรับดาวน์โหลด" },
      { status: 500 }
    );
  }
}
