import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Award,
  Calendar,
  Send,
  HelpCircle,
  Link2,
  KeyRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { StudentProgressChart } from "@/components/charts/StudentProgressChart";

export default async function StudentDashboardPage() {
  const session = await getAuthSession();
  if (!session || session.role !== "STUDENT" || !session.studentId) {
    redirect("/student-login");
  }

  const activeAttendance = await prisma.attendanceSession.findFirst({
    where: { isKeyActive: true },
    select: { id: true, title: true, academicTerm: true },
  });

  const assignments = await prisma.assignment.findMany({
    where: { status: "PUBLISHED" },
    include: {
      rubrics: { orderBy: { sortOrder: "asc" } },
      submissions: {
        where: { studentId: session.studentId },
        include: { grade: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const totalAssignments = assignments.length;
  const submittedAssignments = assignments.filter((a) => a.submissions.length > 0);
  const submittedCount = submittedAssignments.length;
  const pendingGradingCount = assignments.filter(
    (a) =>
      a.submissions[0]?.status === "SUBMITTED" || a.submissions[0]?.status === "LATE"
  ).length;
  const unsubmittedAssignments = assignments.filter((a) => a.submissions.length === 0);
  const unsubmittedCount = unsubmittedAssignments.length;

  const gradedAssignments = assignments.filter(
    (a) => a.submissions[0]?.status === "GRADED" && a.submissions[0]?.grade
  );
  const totalScoreEarned = gradedAssignments.reduce(
    (acc, a) => acc + (a.submissions[0].grade?.score || 0),
    0
  );
  const totalMaxScoreGraded = gradedAssignments.reduce(
    (acc, a) => acc + a.maxScore,
    0
  );

  const completionRate =
    totalAssignments > 0 ? Math.round((submittedCount / totalAssignments) * 100) : 0;

  // Urgent upcoming deadlines (unsubmitted assignments sorted by due date)
  const upcomingDeadlines = unsubmittedAssignments.slice(0, 3);

  // Recent graded feedback
  const recentGraded = gradedAssignments.slice(0, 2);

  // Student assignment scores for Progress Chart
  const studentScores = assignments.map((a) => {
    const sub = a.submissions[0];
    const isGraded = sub?.status === "GRADED";
    const isSubmitted = !!sub;

    return {
      id: a.id,
      title: a.title,
      maxScore: a.maxScore,
      earnedScore: sub?.grade?.score,
      status: (isGraded
        ? "GRADED"
        : isSubmitted
        ? "SUBMITTED"
        : "PENDING") as "GRADED" | "SUBMITTED" | "PENDING",
    };
  });

  return (
    <div className="space-y-6">
      {/* Live Active Attendance Banner */}
      {activeAttendance && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6 text-amber-100 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100">
                  กำลังเปิดรับเช็กชื่อ Real-Time!
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight">
                {activeAttendance.title}
              </h3>
            </div>
          </div>
          <Link
            href="/student/checkin"
            className="self-start sm:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-[#5C4A3A] hover:bg-amber-50 font-bold text-xs shadow-xs active:scale-95 transition-all"
          >
            <span>กดเช็กชื่อทันที</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 1. Compact Hero Header */}
      <div className="bg-gradient-to-r from-[#D9A441] via-[#C96B4B] to-[#B94E48] rounded-3xl p-5 sm:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-44 h-44 bg-white/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold bg-white/20 px-3 py-0.5 rounded-full backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>ชุมนุมสื่อสร้างสรรค์ • ระบบ 3S Party</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              สวัสดี, {session.name || session.username} 👋
            </h1>

            <p className="text-xs text-white/90 flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
              <span>รหัส: <strong>{session.studentCode}</strong></span>
              <span>•</span>
              <span>ชั้น {session.className}</span>
              <span>•</span>
              <span>เลขที่ {session.studentNumber}</span>
            </p>
          </div>

          {/* Quick Progress Indicator */}
          <div className="bg-black/15 backdrop-blur-xs rounded-2xl p-3.5 md:min-w-[240px] space-y-2 border border-white/20">
            <div className="flex items-center justify-between text-xs font-bold text-white/95">
              <span>ความคืบหน้า</span>
              <span>{completionRate}%</span>
            </div>
            <div className="w-full h-2 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-[11px] text-white/80 text-right">
              ส่งแล้ว {submittedCount} จาก {totalAssignments} งาน
            </p>
          </div>
        </div>
      </div>

      {/* 2. PRIORITY ACTION SECTION (TO-DO FIRST) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="font-bold text-[#3F342B] text-base sm:text-lg flex items-center gap-2">
              <span>ภาระงานที่ต้องส่ง</span>
              {unsubmittedCount > 0 && (
                <span className="text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                  ค้างส่ง {unsubmittedCount} งาน
                </span>
              )}
            </h2>
          </div>

          <Link
            href="/student/assignments"
            className="text-xs font-bold text-[#8C5D23] hover:text-[#B94E48] transition-colors flex items-center gap-1"
          >
            <span>ดูงานทั้งหมด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {upcomingDeadlines.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EADBCC] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#3F342B]">
                  ยอดเยี่ยมมาก! ไม่มีงานค้างส่งในขณะนี้ 🎉
                </h3>
                <p className="text-xs text-[#7A6A5C] mt-0.5">
                  คุณได้ส่งผลงานครบทุกชิ้นเรียบร้อยแล้ว รอติดตามผลคะแนนและข้อเสนอแนะจากคุณครู
                </p>
              </div>
            </div>

            <Link
              href="/student/attendance"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#5A4D41] bg-[#FAF6F0] hover:bg-[#FAF0E1] border border-[#D9CABB] transition-all shrink-0"
            >
              <Calendar className="w-3.5 h-3.5 text-[#D9A441]" />
              <span>ตรวจเช็คการเข้าเรียน</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {upcomingDeadlines.map((assignment) => {
              const isPastDue = Date.now() > new Date(assignment.dueDate).getTime();

              return (
                <div
                  key={assignment.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EADBCC] shadow-2xs hover:border-[#D9A441] transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          assignment.submissionType === "FILE"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : assignment.submissionType === "LINK"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : "bg-purple-50 text-purple-800 border-purple-200"
                        }`}
                      >
                        {assignment.submissionType === "FILE" && "📁 ไฟล์"}
                        {assignment.submissionType === "LINK" && "🔗 ลิงก์"}
                        {assignment.submissionType === "QUESTIONS" && "📝 คำถาม"}
                      </span>

                      <span className="text-[11px] font-semibold text-[#8C5D23] bg-[#FAF0E1] px-2 py-0.5 rounded-lg border border-[#EADBCC]">
                        เต็ม {assignment.maxScore} คะแนน
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#3F342B] group-hover:text-[#8C5D23] transition-colors line-clamp-2">
                      {assignment.title}
                    </h3>

                    <p className="text-[11px] text-[#7A6A5C] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#C96B4B] shrink-0" />
                      <span>
                        ส่งภายใน:{" "}
                        <strong className={isPastDue ? "text-red-600 font-bold" : "text-[#3F342B]"}>
                          {new Date(assignment.dueDate).toLocaleDateString("th-TH", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                        {isPastDue && (
                          <span className="text-red-600 font-bold ml-1">(เลยกำหนด)</span>
                        )}
                      </span>
                    </p>
                  </div>

                  <Link
                    href={`/student/assignments/${assignment.id}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#D9A441] hover:bg-[#C28F30] active:scale-98 text-white text-xs font-bold transition-all shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ส่งงานทันที</span>
                    <ArrowRight className="w-3 h-3 ml-0.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. 3 CORE METRIC CARDS (Streamlined & Clean) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Metric 1: งานค้างส่ง */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EADBCC] shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7A6A5C] font-semibold">งานค้างส่ง (To-Do)</p>
            <p className="text-2xl font-black text-amber-600 leading-tight">
              {unsubmittedCount} <span className="text-xs font-normal text-[#7A6A5C]">งาน</span>
            </p>
            <p className="text-[10px] text-[#A8988B] mt-0.5">ต้องส่งตามกำหนด</p>
          </div>
        </div>

        {/* Metric 2: ส่งแล้วรอตรวจ */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EADBCC] shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7A6A5C] font-semibold">รอตรวจ (In Review)</p>
            <p className="text-2xl font-black text-blue-600 leading-tight">
              {pendingGradingCount} <span className="text-xs font-normal text-[#7A6A5C]">งาน</span>
            </p>
            <p className="text-[10px] text-[#A8988B] mt-0.5">รอครูประเมินคะแนน</p>
          </div>
        </div>

        {/* Metric 3: คะแนนสะสม */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EADBCC] shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF9F0] border border-[#D9CABB] text-[#B94E48] flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7A6A5C] font-semibold">คะแนนสะสมรวม</p>
            <p className="text-2xl font-black text-[#B94E48] leading-tight">
              {totalScoreEarned}
              <span className="text-xs font-bold text-[#7A6A5C] ml-1">
                / {totalMaxScoreGraded}
              </span>
            </p>
            <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
              {totalMaxScoreGraded > 0
                ? `${Math.round((totalScoreEarned / totalMaxScoreGraded) * 100)}% ผลสัมฤทธิ์`
                : "ยังไม่มีงานที่ตรวจเสร็จ"}
            </p>
          </div>
        </div>
      </div>

      {/* 4. RECENT GRADED FEEDBACK SECTION */}
      {recentGraded.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-3">
            <h2 className="font-bold text-[#3F342B] text-sm sm:text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-[#D9A441]" />
              <span>ผลการประเมินและคำติชมล่าสุดจากครู</span>
            </h2>
            <Link
              href="/student/assignments?status=GRADED"
              className="text-xs font-bold text-[#8C5D23] hover:text-[#B94E48] transition-colors"
            >
              ดูงานที่ตรวจแล้ว →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentGraded.map((assignment) => {
              const grade = assignment.submissions[0]?.grade;

              return (
                <div
                  key={assignment.id}
                  className="p-4 bg-[#FFF9F0] rounded-2xl border border-[#EADBCC] space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-[#3F342B] truncate">
                        {assignment.title}
                      </h4>
                      <span className="text-xs font-extrabold text-[#B94E48] bg-white px-2.5 py-0.5 rounded-lg border border-[#EADBCC] shrink-0">
                        {grade?.score} / {assignment.maxScore} คะแนน
                      </span>
                    </div>

                    {grade?.feedback ? (
                      <p className="text-xs text-[#5A4D41] bg-white p-2.5 rounded-xl border border-[#EADBCC] italic leading-relaxed">
                        💬 &quot;{grade.feedback}&quot;
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#A8988B] italic">
                        (ไม่มีข้อเสนอแนะเพิ่มเติม)
                      </p>
                    )}
                  </div>

                  <div className="pt-2 text-right">
                    <Link
                      href={`/student/assignments/${assignment.id}`}
                      className="text-[11px] font-bold text-[#8C5D23] hover:underline inline-flex items-center gap-1"
                    >
                      <span>ดูรายละเอียดและเกณฑ์ Rubric</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. COLLAPSIBLE PROGRESS & SCORE ANALYTICS */}
      <StudentProgressChart
        title="แนวโน้มพัฒนาการคะแนนและผลงานของฉัน"
        subtitle="เปรียบเทียบคะแนนที่ได้รับในแต่ละภาระงานเทียบกับเกณฑ์คะแนนเต็ม"
        scores={studentScores}
        collapsible={true}
        defaultExpanded={false}
      />
    </div>
  );
}
