import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma/client";
import { getSystemSetting } from "@/lib/settings/system-settings";
import { hasAdminPermission } from "@/lib/auth/permissions";

export const ADMIN_TERM_COOKIE_NAME = "admin_selected_term";

export interface AcademicTermWithStats {
  id: string;
  termCode: string;
  name: string;
  isCurrent: boolean;
  isLocked: boolean;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  assignmentsCount: number;
  sessionsCount: number;
  reportsCount: number;
}

/**
 * ดึงเทอมปัจจุบันของระบบส่วนกลาง (Active Current Term)
 */
export async function getCurrentSystemTerm(): Promise<string> {
  const current = await getSystemSetting("academic_term");
  return current || "1/2569";
}

/**
 * ตรวจสอบและซิงก์ข้อมูลภาคเรียนตั้งต้นหากยังไม่มีในตาราง academic_terms
 */
export async function syncAcademicTerms(): Promise<void> {
  try {
    const count = await prisma.academicTerm.count();
    const currentTerm = await getCurrentSystemTerm();

    if (count === 0) {
      // ดึงเทอมที่มีอยู่เดิมในตาราง AttendanceSession, Assignment, GeneratedReport
      const [attendanceTerms, assignmentTerms, reportTerms] = await Promise.all([
        prisma.attendanceSession.findMany({
          select: { academicTerm: true },
          distinct: ["academicTerm"],
        }),
        prisma.assignment.findMany({
          select: { academicTerm: true },
          distinct: ["academicTerm"],
        }),
        prisma.generatedReport.findMany({
          select: { academicTerm: true },
          distinct: ["academicTerm"],
        }),
      ]);

      const set = new Set<string>();
      if (currentTerm) set.add(currentTerm);
      attendanceTerms.forEach((t) => t.academicTerm && set.add(t.academicTerm));
      assignmentTerms.forEach((t) => t.academicTerm && set.add(t.academicTerm));
      reportTerms.forEach((t) => t.academicTerm && set.add(t.academicTerm));

      for (const code of set) {
        const isCurrent = code === currentTerm;
        const [termNumber, year] = code.split("/");
        const termName = termNumber && year 
          ? `ภาคเรียนที่ ${termNumber} ปีการศึกษา ${year}`
          : `ภาคเรียน ${code}`;

        await prisma.academicTerm.upsert({
          where: { termCode: code },
          update: { isCurrent },
          create: {
            termCode: code,
            name: termName,
            isCurrent,
            isLocked: !isCurrent, // เทอมเก่าล็อกอัตโนมัติ เทอมปัจจุบันเปิด
          },
        });
      }
    } else {
      // ตรวจสอบว่าเทอม current ใน DB ตรงกับ system_settings หรือไม่
      await prisma.academicTerm.updateMany({
        where: { termCode: currentTerm, isCurrent: false },
        data: { isCurrent: true },
      });
    }
  } catch (error) {
    console.warn("[TermService] Notice: Error during syncAcademicTerms:", error);
  }
}

/**
 * ตรวจสอบว่าเทอมนี้ถูกล็อก (ห้ามแก้ไข) หรือไม่
 */
export async function isTermLocked(termCode: string): Promise<boolean> {
  try {
    const term = await prisma.academicTerm.findUnique({
      where: { termCode },
      select: { isLocked: true },
    });
    return term?.isLocked ?? false;
  } catch (error) {
    console.warn("[TermService] Error checking isTermLocked:", error);
    return false;
  }
}

/**
 * ตรวจสอบว่าผู้ใช้มีสิทธิ์แก้ไขข้อมูล (สร้างการบ้าน, เช็กชื่อ, แก้ไขคะแนน) ในเทอมนี้หรือไม่
 * - หากเทอมไม่ได้ล็อก: ทุกคนที่มีสิทธิ์งานนั้นๆ แก้ไขได้
 * - หากเทอมถูกล็อก: เฉพาะผู้ใช้ที่มีสิทธิ์ MANAGE_SETTINGS หรือเป็น SUPER_ADMIN เท่านั้นที่แก้ไขได้
 */
export async function checkTermCanEdit(
  termCode: string,
  user: any
): Promise<{ canEdit: boolean; reason?: string }> {
  const locked = await isTermLocked(termCode);
  if (!locked) {
    return { canEdit: true };
  }

  // หากเทอมถูกล็อก ให้ตรวจสอบว่า user มีสิทธิ์ MANAGE_SETTINGS หรือเป็น SUPER_ADMIN หรือไม่
  const canBypassLock = hasAdminPermission(user, "MANAGE_SETTINGS");
  if (canBypassLock) {
    return { canEdit: true };
  }

  return {
    canEdit: false,
    reason: `ภาคเรียน "${termCode}" ถูกล็อกแล้ว ไม่สามารถเพิ่มหรือแก้ไขข้อมูลได้ (เฉพาะผู้ดูแลระบบที่มีสิทธิ์ตั้งค่าระบบเท่านั้น)`,
  };
}

/**
 * ดึงเทอมที่ผู้ดูแลระบบ/ครูกำลังเลือกดูอยู่ขณะนี้
 * หากคุกกี้ชี้ไปยังเทอมที่ไม่มีอยู่ในฐานข้อมูล (เช่น ถูกลบไปแล้ว) จะล้างคุกกี้และย้อนกลับไปใช้เทอมปัจจุบัน
 */
export async function getAdminSelectedTerm(): Promise<string> {
  const currentTerm = await getCurrentSystemTerm();
  const cookieStore = await cookies();
  const selectedTerm = cookieStore.get(ADMIN_TERM_COOKIE_NAME)?.value?.trim();

  if (selectedTerm) {
    try {
      const exists = await prisma.academicTerm.findUnique({
        where: { termCode: selectedTerm },
        select: { id: true },
      });
      if (exists) {
        return selectedTerm;
      }
      // หากเทอมไม่มีอยู่ใน DB แล้ว ให้ลบ Cookie ตกค้างออก
      cookieStore.delete(ADMIN_TERM_COOKIE_NAME);
    } catch {
      // ignore
    }
  }

  return currentTerm;
}

/**
 * ดึงรายการเทอมทั้งหมดที่มีอยู่ในระบบ (เฉพาะเทอมที่มีอยู่ในฐานข้อมูล academic_terms เท่านั้น)
 */
export async function getAllRegisteredTerms(): Promise<string[]> {
  await syncAcademicTerms();
  const currentTerm = await getCurrentSystemTerm();

  try {
    const terms = await prisma.academicTerm.findMany({
      select: { termCode: true },
      orderBy: [{ isCurrent: "desc" }, { termCode: "desc" }],
    });

    const set = new Set<string>();
    if (currentTerm) set.add(currentTerm);
    terms.forEach((t) => set.add(t.termCode));

    // เรียงลำดับเทอม เช่น 2/2569, 1/2569, 2/2568, 1/2568
    return Array.from(set).sort((a, b) => {
      const [termA, yearA] = a.split("/").map((v) => parseInt(v, 10) || 0);
      const [termB, yearB] = b.split("/").map((v) => parseInt(v, 10) || 0);
      if (yearA !== yearB) return yearB - yearA;
      return termB - termA;
    });
  } catch (error) {
    console.warn("[TermService] Error fetching registered terms:", error);
    return [currentTerm];
  }
}

/**
 * ดึงรายการเทอมทั้งหมดพร้อมข้อมูลสถิติ (สำหรับหน้า /admin/terms)
 */
export async function getAllAcademicTermsWithStats(): Promise<AcademicTermWithStats[]> {
  await syncAcademicTerms();

  try {
    const terms = await prisma.academicTerm.findMany({
      orderBy: [{ isCurrent: "desc" }, { termCode: "desc" }],
    });

    const results = await Promise.all(
      terms.map(async (t) => {
        const [assignmentsCount, sessionsCount, reportsCount] = await Promise.all([
          prisma.assignment.count({ where: { academicTerm: t.termCode } }),
          prisma.attendanceSession.count({ where: { academicTerm: t.termCode } }),
          prisma.generatedReport.count({ where: { academicTerm: t.termCode } }),
        ]);

        return {
          id: t.id,
          termCode: t.termCode,
          name: t.name,
          isCurrent: t.isCurrent,
          isLocked: t.isLocked,
          description: t.description,
          startDate: t.startDate ? t.startDate.toISOString() : null,
          endDate: t.endDate ? t.endDate.toISOString() : null,
          createdAt: t.createdAt.toISOString(),
          assignmentsCount,
          sessionsCount,
          reportsCount,
        };
      })
    );

    return results;
  } catch (error) {
    console.error("[TermService] Error fetching academic terms with stats:", error);
    return [];
  }
}

/**
 * ดึง Context ข้อมูลเทอมแบบครบถ้วนสำหรับหน้า Admin
 */
export async function getAdminTermContext(): Promise<{
  currentTerm: string;
  selectedTerm: string;
  isViewingPastTerm: boolean;
  isCurrentTermLocked: boolean;
  isSelectedTermLocked: boolean;
  availableTerms: string[];
}> {
  const [currentTerm, selectedTerm, availableTerms] = await Promise.all([
    getCurrentSystemTerm(),
    getAdminSelectedTerm(),
    getAllRegisteredTerms(),
  ]);

  const [isCurrentTermLocked, isSelectedTermLocked] = await Promise.all([
    isTermLocked(currentTerm),
    isTermLocked(selectedTerm),
  ]);

  return {
    currentTerm,
    selectedTerm,
    isViewingPastTerm: selectedTerm !== currentTerm,
    isCurrentTermLocked,
    isSelectedTermLocked,
    availableTerms,
  };
}
