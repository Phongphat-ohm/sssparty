import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getAuthSession } from "@/lib/auth/session";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { generateAssignmentReportPdfViaApi } from "@/lib/export/report-api-service";

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
      select: { id: true, username: true, role: true, adminRole: true, permissions: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ error: "บัญชีไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
    }

    const canExport =
      hasAdminPermission(user, "GRADE_SUBMISSIONS") ||
      hasAdminPermission(user, "MANAGE_ASSIGNMENTS");

    if (!canExport) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ในการสร้างเอกสารรายงานคะแนน (Forbidden)" },
        { status: 403 }
      );
    }

    const resolved = await params;
    const assignmentId = resolved.id;
    const { searchParams } = new URL(req.url);
    const filterClass = searchParams.get("className") || "ALL";
    const customReportCode = searchParams.get("reportCode") || undefined;

    const { pdfBuffer, fileName, reportCode } =
      await generateAssignmentReportPdfViaApi({
        assignmentId,
        filterClass,
        customReportCode,
        user: { id: user.id, username: user.username },
      });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("API /api/export/assignments/[id]/render error:", error);
    return NextResponse.json(
      { error: error?.message || "เกิดข้อผิดพลาดในการสร้างเอกสารรายงาน PDF" },
      { status: 500 }
    );
  }
}
