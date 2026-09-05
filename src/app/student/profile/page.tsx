import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import {
  UserCheck,
  Award,
  BookOpen,
  Calendar,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { StudentProfileForm } from "@/components/student/StudentProfileForm";
import { getSystemSetting } from "@/lib/settings/system-settings";

export default async function StudentProfilePage() {
  const session = await getAuthSession();
  if (!session || session.role !== "STUDENT" || !session.studentId) {
    redirect("/student-login");
  }

  const [student, allowStudentNameEdit] = await Promise.all([
    prisma.student.findUnique({
      where: { id: session.studentId },
      include: {
        submissions: {
          include: {
            grade: { select: { score: true } },
          },
        },
      },
    }),
    getSystemSetting("allow_student_name_edit"),
  ]);

  if (!student) {
    redirect("/student-login");
  }

  const totalSubmissions = student.submissions.length;
  const gradedSubmissions = student.submissions.filter((s) => s.grade);
  const totalEarnedScore = gradedSubmissions.reduce(
    (acc, s) => acc + (s.grade?.score || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Profile Banner */}
      <div className="bg-gradient-to-r from-[#D9A441] via-[#C96B4B] to-[#B94E48] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-52 h-52 bg-white/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center font-black text-2xl sm:text-3xl border-2 border-white/30 shadow-md">
              {student.firstName.charAt(0)}
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wider font-bold bg-white/20 px-3 py-0.5 rounded-full backdrop-blur-xs">
                <Sparkles className="w-3 h-3 text-amber-200" />
                <span>สมาชิกชุมนุมสื่อสร้างสรรค์</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                {student.firstName} {student.lastName}
              </h1>
              <p className="text-xs sm:text-sm text-white/90 flex flex-wrap items-center gap-x-2.5 font-medium">
                <span>รหัส: <strong>{student.studentCode}</strong></span>
                <span>•</span>
                <span>ห้อง {student.className}</span>
                <span>•</span>
                <span>เลขที่ {student.studentNumber}</span>
              </p>
            </div>
          </div>

          {/* Mini Stats */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-white/25 pt-3 sm:pt-0 sm:pl-6 gap-2">
            <div className="text-left sm:text-right">
              <span className="text-[11px] text-white/80 block">ส่งงานแล้ว</span>
              <strong className="text-lg sm:text-xl font-bold">{totalSubmissions} ชิ้น</strong>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-white/80 block">คะแนนสะสม</span>
              <strong className="text-lg sm:text-xl font-bold text-amber-200">{totalEarnedScore} คะแนน</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Profile Management Form */}
      <StudentProfileForm
        initialFirstName={student.firstName}
        initialLastName={student.lastName}
        studentCode={student.studentCode}
        className={student.className}
        studentNumber={student.studentNumber}
        allowEdit={allowStudentNameEdit}
      />
    </div>
  );
}
