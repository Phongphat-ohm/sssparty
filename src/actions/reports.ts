"use server";

import { prisma } from "@/lib/prisma/client";
import { requireAdminPermission } from "@/lib/auth/permissions-server";
import { getSystemSetting } from "@/lib/settings/system-settings";

export interface GradebookReportData {
  academicTerm: string;
  className: string;
  totalStudents: number;
  totalMaxPossibleScore: number;
  assignments: {
    id: string;
    title: string;
    maxScore: number;
  }[];
  students: {
    studentNumber: number;
    studentCode: string;
    name: string;
    className: string;
    scores: Record<string, number | null>;
    totalScore: number;
    percentage: number;
    passed: boolean;
  }[];
  stats: {
    avgTotalScore: number;
    avgPercentage: number;
    passedCount: number;
    failedCount: number;
  };
}

export interface AttendanceSummaryReportData {
  academicTerm: string;
  className: string;
  totalStudents: number;
  totalSessions: number;
  sessions: {
    id: string;
    title: string;
    date: string;
  }[];
  students: {
    studentNumber: number;
    studentCode: string;
    name: string;
    className: string;
    present: number;
    late: number;
    leave: number;
    absent: number;
    percentage: number;
    passed: boolean;
  }[];
  stats: {
    passedCount: number;
    failedCount: number;
    avgPercentage: number;
  };
}

export interface ComprehensiveEvaluationReportData {
  academicTerm: string;
  clubName: string;
  className: string;
  totalStudents: number;
  totalSessions: number;
  totalMaxPossibleScore: number;
  assignments: {
    id: string;
    title: string;
    maxScore: number;
  }[];
  students: {
    studentNumber: number;
    studentCode: string;
    name: string;
    className: string;
    // เวลาเรียน
    present: number;
    late: number;
    leave: number;
    absent: number;
    effectivePresent: number;
    attendancePercentage: number;
    attendancePassed: boolean;
    // คะแนนชิ้นงาน
    scores: Record<string, number | null>;
    totalScore: number;
    scorePercentage: number;
    // สรุปผลการประเมิน
    passed: boolean;
    finalGrade: "ผ" | "มผ";
  }[];
  stats: {
    passedCount: number;
    failedCount: number;
    avgAttendancePercentage: number;
    avgScorePercentage: number;
    avgTotalScore: number;
  };
}

/**
 * ดึงข้อมูลรายงานสมุดคะแนนรวม (Gradebook Report)
 */
export async function getGradebookReportDataAction(
  filterClass: string = "ALL"
): Promise<{ success: boolean; data?: GradebookReportData; message?: string }> {
  try {
    const authCheck = await requireAdminPermission("GRADE_SUBMISSIONS");
    if (!authCheck.ok) {
      const altCheck = await requireAdminPermission("MANAGE_ASSIGNMENTS");
      if (!altCheck.ok) {
        return { success: false, message: authCheck.error };
      }
    }

    const academicTerm = (await getSystemSetting("academic_term")) || "1/2569";

    const assignments = await prisma.assignment.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      include: {
        submissions: {
          include: { grade: true },
        },
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

    let totalMaxPossibleScore = 0;
    assignments.forEach((a) => {
      totalMaxPossibleScore += a.maxScore;
    });

    let allStudentsTotalSum = 0;
    let passedCount = 0;

    const reportStudents = students.map((s) => {
      let studentTotal = 0;
      const scores: Record<string, number | null> = {};

      assignments.forEach((a) => {
        const sub = a.submissions.find((sub) => sub.studentId === s.id);
        if (sub && sub.grade && typeof sub.grade.score === "number") {
          scores[a.id] = sub.grade.score;
          studentTotal += sub.grade.score;
        } else {
          scores[a.id] = null;
        }
      });

      allStudentsTotalSum += studentTotal;
      const percentage =
        totalMaxPossibleScore > 0
          ? Number(((studentTotal / totalMaxPossibleScore) * 100).toFixed(2))
          : 0;

      const passed = percentage >= 50;
      if (passed) passedCount++;

      return {
        studentNumber: s.studentNumber,
        studentCode: s.studentCode,
        name: `${s.firstName} ${s.lastName}`,
        className: s.className,
        scores,
        totalScore: studentTotal,
        percentage,
        passed,
      };
    });

    const avgTotalScore =
      students.length > 0
        ? Number((allStudentsTotalSum / students.length).toFixed(2))
        : 0;

    const avgPercentage =
      totalMaxPossibleScore > 0
        ? Number(((avgTotalScore / totalMaxPossibleScore) * 100).toFixed(2))
        : 0;

    return {
      success: true,
      data: {
        academicTerm,
        className: filterClass,
        totalStudents: students.length,
        totalMaxPossibleScore,
        assignments: assignments.map((a) => ({
          id: a.id,
          title: a.title,
          maxScore: a.maxScore,
        })),
        students: reportStudents,
        stats: {
          avgTotalScore,
          avgPercentage,
          passedCount,
          failedCount: students.length - passedCount,
        },
      },
    };
  } catch (error: any) {
    console.error("getGradebookReportDataAction error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน" };
  }
}

/**
 * ดึงข้อมูลรายงานสรุปเวลาเรียนรวมทุกคาบ (Overall Attendance Summary Report)
 */
export async function getAttendanceSummaryReportDataAction(
  filterClass: string = "ALL"
): Promise<{ success: boolean; data?: AttendanceSummaryReportData; message?: string }> {
  try {
    const authCheck = await requireAdminPermission("MANAGE_ATTENDANCE");
    if (!authCheck.ok) {
      return { success: false, message: authCheck.error };
    }

    const academicTerm = (await getSystemSetting("academic_term")) || "1/2569";

    const sessions = await prisma.attendanceSession.findMany({
      orderBy: { date: "asc" },
      include: { records: true },
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
    let passedCount = 0;
    let totalPercentageSum = 0;

    const reportStudents = students.map((student) => {
      let present = 0;
      let late = 0;
      let leave = 0;
      let absent = 0;

      sessions.forEach((sess) => {
        const rec = sess.records.find((r) => r.studentId === student.id);
        if (rec) {
          if (rec.status === "PRESENT") present++;
          else if (rec.status === "LATE") late++;
          else if (rec.status === "LEAVE") leave++;
          else if (rec.status === "ABSENT") absent++;
        } else {
          absent++;
        }
      });

      const effectivePresent = present + late * 0.5;
      const percentage =
        totalSessions > 0
          ? Number(((effectivePresent / totalSessions) * 100).toFixed(2))
          : 0;

      totalPercentageSum += percentage;
      const passed = percentage >= 80;
      if (passed) passedCount++;

      return {
        studentNumber: student.studentNumber,
        studentCode: student.studentCode,
        name: `${student.firstName} ${student.lastName}`,
        className: student.className,
        present,
        late,
        leave,
        absent,
        percentage,
        passed,
      };
    });

    const avgPercentage =
      students.length > 0
        ? Number((totalPercentageSum / students.length).toFixed(2))
        : 0;

    return {
      success: true,
      data: {
        academicTerm,
        className: filterClass,
        totalStudents: students.length,
        totalSessions,
        sessions: sessions.map((s) => ({
          id: s.id,
          title: s.title,
          date: s.date.toISOString(),
        })),
        students: reportStudents,
        stats: {
          passedCount,
          failedCount: students.length - passedCount,
          avgPercentage,
        },
      },
    };
  } catch (error: any) {
    console.error("getAttendanceSummaryReportDataAction error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน" };
  }
}

/**
 * ดึงข้อมูลรายงานผลการเรียนรู้และการเข้าร่วมกิจกรรมพัฒนาผู้เรียน (รวมส่งงาน & เวลาเรียน)
 */
export async function getComprehensiveEvaluationReportDataAction(
  filterClass: string = "ALL"
): Promise<{ success: boolean; data?: ComprehensiveEvaluationReportData; message?: string }> {
  try {
    const authCheck = await requireAdminPermission("GRADE_SUBMISSIONS");
    if (!authCheck.ok) {
      const altCheck = await requireAdminPermission("MANAGE_ASSIGNMENTS");
      if (!altCheck.ok) {
        return { success: false, message: authCheck.error };
      }
    }

    const academicTerm = (await getSystemSetting("academic_term")) || "1/2569";
    const clubName =
      (await getSystemSetting("site_name")) ||
      "ชุมนุมสื่อสร้างสรรค์ (3S Party – Creative Media Club)";

    // 1. ดึงภาระงานทั้งหมด
    const assignments = await prisma.assignment.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      include: {
        submissions: {
          include: { grade: true },
        },
      },
    });

    // 2. ดึงคาบกิจกรรมทั้งหมด
    const sessions = await prisma.attendanceSession.findMany({
      where: { academicTerm },
      include: { records: true },
      orderBy: { date: "asc" },
    });

    // 3. ดึงนักเรียน
    const studentWhere: any = { status: "ACTIVE" };
    if (filterClass !== "ALL") {
      studentWhere.className = filterClass;
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      orderBy: [{ className: "asc" }, { studentNumber: "asc" }],
    });

    let totalMaxPossibleScore = 0;
    assignments.forEach((a) => {
      totalMaxPossibleScore += a.maxScore;
    });

    const totalSessions = sessions.length;
    let passedCount = 0;
    let totalScoreSum = 0;
    let totalScorePercentSum = 0;
    let totalAttendancePercentSum = 0;

    const reportStudents = students.map((s) => {
      // 3.1 คำนวณเวลาเรียน
      let present = 0;
      let late = 0;
      let leave = 0;
      let absent = 0;

      sessions.forEach((sess) => {
        const rec = sess.records.find((r) => r.studentId === s.id);
        if (rec) {
          if (rec.status === "PRESENT") present++;
          else if (rec.status === "LATE") late++;
          else if (rec.status === "LEAVE") leave++;
          else if (rec.status === "ABSENT") absent++;
        } else {
          absent++;
        }
      });

      const effectivePresent = present + late * 0.5;
      const attendancePercentage =
        totalSessions > 0
          ? Number(((effectivePresent / totalSessions) * 100).toFixed(2))
          : 0;
      const attendancePassed = totalSessions === 0 || attendancePercentage >= 80;

      // 3.2 คำนวณคะแนนชิ้นงาน
      let studentTotalScore = 0;
      const scores: Record<string, number | null> = {};

      assignments.forEach((a) => {
        const sub = a.submissions.find((sub) => sub.studentId === s.id);
        if (sub && sub.grade && typeof sub.grade.score === "number") {
          scores[a.id] = sub.grade.score;
          studentTotalScore += sub.grade.score;
        } else {
          scores[a.id] = null;
        }
      });

      const scorePercentage =
        totalMaxPossibleScore > 0
          ? Number(((studentTotalScore / totalMaxPossibleScore) * 100).toFixed(2))
          : 0;
      const assignmentPassed = totalMaxPossibleScore === 0 || scorePercentage >= 50;

      // 3.3 ตัดสินผลการประเมินกิจกรรมพัฒนาผู้เรียน ("ผ" / "มผ")
      const isPassed = attendancePassed && assignmentPassed;
      if (isPassed) passedCount++;

      totalScoreSum += studentTotalScore;
      totalScorePercentSum += scorePercentage;
      totalAttendancePercentSum += attendancePercentage;

      return {
        studentNumber: s.studentNumber,
        studentCode: s.studentCode,
        name: `${s.firstName} ${s.lastName}`,
        className: s.className,
        present,
        late,
        leave,
        absent,
        effectivePresent,
        attendancePercentage,
        attendancePassed,
        scores,
        totalScore: studentTotalScore,
        scorePercentage,
        passed: isPassed,
        finalGrade: (isPassed ? "ผ" : "มผ") as "ผ" | "มผ",
      };
    });

    const totalStudents = students.length;
    const avgTotalScore =
      totalStudents > 0 ? Number((totalScoreSum / totalStudents).toFixed(1)) : 0;
    const avgScorePercentage =
      totalStudents > 0 ? Number((totalScorePercentSum / totalStudents).toFixed(2)) : 0;
    const avgAttendancePercentage =
      totalStudents > 0 ? Number((totalAttendancePercentSum / totalStudents).toFixed(2)) : 0;

    return {
      success: true,
      data: {
        academicTerm,
        clubName,
        className: filterClass,
        totalStudents,
        totalSessions,
        totalMaxPossibleScore,
        assignments: assignments.map((a) => ({
          id: a.id,
          title: a.title,
          maxScore: a.maxScore,
        })),
        students: reportStudents,
        stats: {
          passedCount,
          failedCount: totalStudents - passedCount,
          avgAttendancePercentage,
          avgScorePercentage,
          avgTotalScore,
        },
      },
    };
  } catch (error: any) {
    console.error("getComprehensiveEvaluationReportDataAction error:", error);
    return {
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลรายงานผลการเรียนรู้",
    };
  }
}

