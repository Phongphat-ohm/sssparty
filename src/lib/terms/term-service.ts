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

import { DEFAULT_ACADEMIC_TERM } from "@/lib/constants/defaults";

/**
 * ดึงเทอมปัจจุบันของระบบส่วนกลาง (Active Current Term)
 * โดยตรวจสอบจากตาราง academic_terms ในฐานข้อมูลจริงเป็นอันดับแรกเสมอ (Single Source of Truth)
 */
export async function getCurrentSystemTerm(): Promise<string> {
  try {
    // 1. ตรวจสอบในตาราง academic_terms ว่ามีเทอมที่ถูกตั้งเป็น isCurrent: true อยู่จริงหรือไม่
    const activeTerm = await prisma.academicTerm.findFirst({
      where: { isCurrent: true },
      select: { termCode: true },
    });

    if (activeTerm?.termCode) {
      return activeTerm.termCode;
    }

    // 2. หากยังไม่มีเทอมใดถูกตั้งเป็น isCurrent: true ให้ตรวจสอบว่ามีเทอมใดๆ ในตารางหรือไม่
    const anyTermInDb = await prisma.academicTerm.findFirst({
      orderBy: [{ termCode: "desc" }],
      select: { id: true, termCode: true },
    });

    if (anyTermInDb?.termCode) {
      // ตรวจสอบว่าใน system_settings มีการระบุเทอมไว้ และตรงกับเทอมในตารางหรือไม่
      const settingTerm = await getSystemSetting("academic_term");
      let termToActivate = anyTermInDb;
      if (settingTerm) {
        const matchingSetting = await prisma.academicTerm.findUnique({
          where: { termCode: settingTerm },
          select: { id: true, termCode: true },
        });
        if (matchingSetting) {
          termToActivate = matchingSetting;
        }
      }

      // ปรับปรุงในตาราง academic_terms ให้เทอมที่มีอยู่จริงนี้เป็น isCurrent: true
      await prisma.academicTerm.update({
        where: { id: termToActivate.id },
        data: { isCurrent: true },
      });

      return termToActivate.termCode;
    }

    // 3. หากในตาราง academic_terms ว่างเปล่าจริง ๆ จึง fallback ไปยัง system_settings หรือ DEFAULT_ACADEMIC_TERM
    const fallbackSetting = await getSystemSetting("academic_term");
    return fallbackSetting || DEFAULT_ACADEMIC_TERM;
  } catch (error) {
    console.warn("[TermService] Error querying current academic term from DB:", error);
    const fallbackSetting = await getSystemSetting("academic_term");
    return fallbackSetting || DEFAULT_ACADEMIC_TERM;
  }
}

/**
 * ตรวจสอบและซิงก์ข้อมูลภาคเรียนตั้งต้นหากยังไม่มีในตาราง academic_terms
 */
export async function syncAcademicTerms(): Promise<void> {
  try {
    const count = await prisma.academicTerm.count();

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
      attendanceTerms.forEach((t) => t.academicTerm && set.add(t.academicTerm));
      assignmentTerms.forEach((t) => t.academicTerm && set.add(t.academicTerm));
      reportTerms.forEach((t) => t.academicTerm && set.add(t.academicTerm));

      const settingTerm = await getSystemSetting("academic_term");
      const initialCurrent = settingTerm || (set.size > 0 ? Array.from(set)[0] : DEFAULT_ACADEMIC_TERM);
      set.add(initialCurrent);

      for (const code of set) {
        const isCurrent = code === initialCurrent;
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
      // ตรวจสอบว่ามีเทอมที่เป็น isCurrent: true ในตาราง academic_terms หรือยัง
      const currentInDb = await prisma.academicTerm.findFirst({
        where: { isCurrent: true },
      });

      if (!currentInDb) {
        const settingTerm = await getSystemSetting("academic_term");
        let target = settingTerm
          ? await prisma.academicTerm.findUnique({ where: { termCode: settingTerm } })
          : null;

        if (!target) {
          target = await prisma.academicTerm.findFirst({
            orderBy: [{ termCode: "desc" }],
          });
        }

        if (target) {
          await prisma.academicTerm.update({
            where: { id: target.id },
            data: { isCurrent: true },
          });
        }
      }
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

  try {
    const terms = await prisma.academicTerm.findMany({
      select: { termCode: true },
      orderBy: [{ isCurrent: "desc" }, { termCode: "desc" }],
    });

    if (terms.length === 0) {
      const currentTerm = await getCurrentSystemTerm();
      return [currentTerm];
    }

    // เรียงลำดับเทอมเฉพาะที่มีอยู่ในตาราง academic_terms จริงเท่านั้น
    return terms
      .map((t) => t.termCode)
      .sort((a, b) => {
        const [termA, yearA] = a.split("/").map((v) => parseInt(v, 10) || 0);
        const [termB, yearB] = b.split("/").map((v) => parseInt(v, 10) || 0);
        if (yearA !== yearB) return yearB - yearA;
        return termB - termA;
      });
  } catch (error) {
    console.warn("[TermService] Error fetching registered terms:", error);
    const currentTerm = await getCurrentSystemTerm();
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
  await syncAcademicTerms();

  const [rawCurrentTerm, rawSelectedTerm, availableTerms] = await Promise.all([
    getCurrentSystemTerm(),
    getAdminSelectedTerm(),
    getAllRegisteredTerms(),
  ]);

  // ตรวจสอบความถูกต้องว่า currentTerm มีอยู่ใน availableTerms หรือไม่
  let currentTerm = rawCurrentTerm;
  if (availableTerms.length > 0 && !availableTerms.includes(currentTerm)) {
    currentTerm = availableTerms[0];
  }

  // ตรวจสอบว่า selectedTerm มีอยู่ใน availableTerms หรือไม่
  let selectedTerm = rawSelectedTerm;
  if (availableTerms.length > 0 && !availableTerms.includes(selectedTerm)) {
    selectedTerm = currentTerm;
  }

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
