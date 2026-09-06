import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getAuthSession } from "@/lib/auth/session";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { generateCsvString, createCsvResponse } from "@/lib/export/csv-helper";
import { createAuditLog } from "@/lib/audit/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

    if (!hasAdminPermission(user, "MANAGE_ATTENDANCE")) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ในการส่งออกข้อมูลการเช็กชื่อ (Forbidden)" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const filterClass = searchParams.get("className") || "ALL";

    // กรณีที่ 1: ส่งออกเฉพาะคาบที่ระบุ (Single Session Export)
    if (sessionId) {
      const attendanceSession = await prisma.attendanceSession.findUnique({
        where: { id: sessionId },
        include: {
          records: {
            include: { student: true },
          },
        },
      });

      if (!attendanceSession) {
        return NextResponse.json({ error: "ไม่พบคาบกิจกรรมที่ระบุ" }, { status: 404 });
      }

      const studentWhere: any = { status: "ACTIVE" };
      if (filterClass !== "ALL") {
        studentWhere.className = filterClass;
      }

      const students = await prisma.student.findMany({
        where: studentWhere,
        orderBy: [{ className: "asc" }, { studentNumber: "asc" }],
      });

      const recordsMap = new Map(
        attendanceSession.records.map((r) => [r.studentId, r])
      );

      const sessionDateStr = new Date(attendanceSession.date).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const headers = [
        "เลขที่",
        "รหัสนักเรียน",
        "ชื่อ-นามสกุล",
        "ห้อง",
        "สถานะการเช็กชื่อ",
        "เวลาที่เช็กชื่อ",
        "หมายเหตุ",
        "คาบกิจกรรม",
        "วันที่จัดกิจกรรม",
      ];

      const rows: (string | number | null | undefined)[][] = [headers];

      for (const student of students) {
        const record = recordsMap.get(student.id);

        let statusText = "ยังไม่ได้เช็กชื่อ";
        let checkTimeStr = "-";
        let noteText = "-";

        if (record) {
          if (record.status === "PRESENT") statusText = "มาเรียน";
          else if (record.status === "LATE") statusText = "มาสาย";
          else if (record.status === "ABSENT") statusText = "ขาดเรียน";
          else if (record.status === "LEAVE") statusText = "ลา";

          if (record.checkedAt) {
            checkTimeStr = new Date(record.checkedAt).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            }) + " น.";
          }
          noteText = record.note || "-";
        }

        rows.push([
          student.studentNumber,
          student.studentCode,
          `${student.firstName} ${student.lastName}`,
          student.className,
          statusText,
          checkTimeStr,
          noteText,
          attendanceSession.title,
          sessionDateStr,
        ]);
      }

      const csvContent = generateCsvString(rows);
      const cleanTitle = attendanceSession.title.replace(/[^a-zA-Z0-9ก-๙_-]/g, "_");
      const filename = `เช็กชื่อ_${cleanTitle}.csv`;

      await createAuditLog({
        username: session.username,
        role: "ADMIN",
        action: "SETTINGS_UPDATE",
        targetType: "ATTENDANCE",
        targetId: attendanceSession.id,
        details: `ส่งออกไฟล์เช็กชื่อคาบ "${attendanceSession.title}" เป็น CSV (${students.length} คน)`,
      });

      return createCsvResponse(csvContent, filename);
    }

    // กรณีที่ 2: ส่งออกสรุปเวลาเรียนรวมทั้งภาคเรียน (Overall Attendance Summary)
    const sessions = await prisma.attendanceSession.findMany({
      orderBy: { date: "asc" },
      include: {
        records: true,
      },
    });

    const studentWhere: any = { status: "ACTIVE" };
    if (filterClass !== "ALL") {
      studentWhere.className = filterClass;
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      orderBy: [{ className: "asc" }, { studentNumber: "asc" }],
    });

    const totalSessions = sessions.length;

    const headers = [
      "เลขที่",
      "รหัสนักเรียน",
      "ชื่อ-นามสกุล",
      "ห้อง",
      "มาเรียน (ครั้ง)",
      "มาสาย (ครั้ง)",
      "ลา (ครั้ง)",
      "ขาดเรียน (ครั้ง)",
      `คาบทั้งหมด (${totalSessions})`,
      "ร้อยละเวลาเรียน (%)",
      "ผลการประเมิน (เกณฑ์ 80%)",
    ];

    const rows: (string | number | null | undefined)[][] = [headers];

    for (const student of students) {
      let presentCount = 0;
      let lateCount = 0;
      let leaveCount = 0;
      let absentCount = 0;

      for (const sess of sessions) {
        const rec = sess.records.find((r) => r.studentId === student.id);
        if (rec) {
          if (rec.status === "PRESENT") presentCount++;
          else if (rec.status === "LATE") lateCount++;
          else if (rec.status === "LEAVE") leaveCount++;
          else if (rec.status === "ABSENT") absentCount++;
        } else {
          absentCount++;
        }
      }

      // ในโรงเรียนทั่วไป มาสาย 2-3 ครั้งอาจหักลบ หรือคิด มา + สาย/2 หรือคิด มา+สาย
      // ที่นี่คำนวณ: (มา + สาย) / คาบทั้งหมด
      const effectivePresent = presentCount + (lateCount * 0.5);
      const percentage =
        totalSessions > 0
          ? ((effectivePresent / totalSessions) * 100).toFixed(2)
          : "0.00";

      const passed = parseFloat(percentage) >= 80 ? "ผ่าน" : "ไม่ผ่าน (มส.)";

      rows.push([
        student.studentNumber,
        student.studentCode,
        `${student.firstName} ${student.lastName}`,
        student.className,
        presentCount,
        lateCount,
        leaveCount,
        absentCount,
        totalSessions,
        `${percentage}%`,
        passed,
      ]);
    }

    const csvContent = generateCsvString(rows);
    const classSuffix = filterClass !== "ALL" ? `_ห้อง_${filterClass}` : "_ทุกห้อง";
    const filename = `สรุปเวลาเรียนกิจกรรมชุมนุม${classSuffix}.csv`;

    await createAuditLog({
      username: session.username,
      role: "ADMIN",
      action: "SETTINGS_UPDATE",
      targetType: "ATTENDANCE",
      details: `ส่งออกสรุปเวลาเรียนรวมทุกคาบเป็น CSV (${students.length} คน, ${totalSessions} คาบ)`,
    });

    return createCsvResponse(csvContent, filename);
  } catch (error: any) {
    console.error("Export attendance error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการส่งออกข้อมูลการเช็กชื่อ" },
      { status: 500 }
    );
  }
}
