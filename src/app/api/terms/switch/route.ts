import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getAuthSession } from "@/lib/auth/session";
import { ADMIN_TERM_COOKIE_NAME, getCurrentSystemTerm } from "@/lib/terms/term-service";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบ" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const term = typeof body.term === "string" ? body.term.trim() : "";

    const currentTerm = await getCurrentSystemTerm();
    const response = NextResponse.json({ success: true });

    // หากส่งคำสั่งรีเซ็ต หรือเป็นเทอมปัจจุบันของระบบ ให้ลบคุกกี้ออก
    if (!term || term === "RESET" || term === currentTerm) {
      response.cookies.delete(ADMIN_TERM_COOKIE_NAME);
      return response;
    }

    // ต้องเป็นเทอมที่มีอยู่ในฐานข้อมูลเท่านั้น
    const existing = await prisma.academicTerm.findUnique({
      where: { termCode: term },
      select: { id: true, termCode: true },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: `ไม่พบภาคเรียน "${term}" ในระบบ ต้องสร้างผ่านศูนย์จัดการภาคเรียนก่อนเท่านั้น`,
        },
        { status: 400 }
      );
    }

    response.cookies.set(ADMIN_TERM_COOKIE_NAME, term, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error("[ApiTermsSwitch] Error switching term:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "ไม่สามารถเปลี่ยนภาคเรียนได้" },
      { status: 500 }
    );
  }
}
