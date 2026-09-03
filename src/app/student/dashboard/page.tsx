import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  FileText,
  AlertTriangle,
  Award,
  Calendar,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { StudentProgressChart } from "@/components/charts/StudentProgressChart";

export default async function StudentDashboardPage() {
  const session = await getAuthSession();
  if (!session || session.role !== "STUDENT" || !session.studentId) {
    redirect("/student-login");
  }

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

  // Upcoming deadlines (unsubmitted assignments sorted by due date)
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
      {/* 1. Hero Welcome Card */}
      <div className="bg-gradient-to-r from-[#D9A441] via-[#C96B4B] to-[#B94E48] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-56 h-56 bg-white/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-bold bg-white/20 px-3.5 py-1 rounded-full backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>ชุมนุมสื่อสร้างสรรค์ • SSSParty</span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ยินดีต้อนรับ, {session.name || session.username} 👋
            </h1>
            <p className="text-xs sm:text-sm text-white/90 mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-medium">
              <span>รหัสนักเรียน: <strong>{session.studentCode}</strong></span>
              <span>•</span>
              <span>ชั้น {session.className}</span>
              <span>•</span>
              <span>เลขที่ {session.studentNumber}</span>
            </p>
          </div>

          {/* Progress Bar inside banner */}
          <div className="pt-2 max-w-md space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-white/90">
              <span>ความคืบหน้าการส่งงาน:</span>
              <span>
                {submittedCount} จาก {totalAssignments} งาน ({completionRate}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 5 Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: งานทั้งหมด */}
        <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-2xs space-y-1">
          <p className="text-xs text-[#7A6A5C] flex items-center gap-1.5 font-medium">
            <BookOpen className="w-3.5 h-3.5 text-[#D9A441]" />
            งานทั้งหมด
          </p>
          <p className="text-2xl font-extrabold text-[#3F342B]">{totalAssignments}</p>
          <p className="text-[10px] text-[#A8988B]">ภาระงานชุมนุม</p>
        </div>

        {/* Metric 2: ส่งงานแล้ว */}
        <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-2xs space-y-1">
          <p className="text-xs text-[#7A6A5C] flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ส่งแล้ว
          </p>
          <p className="text-2xl font-extrabold text-emerald-600">{submittedCount}</p>
          <p className="text-[10px] text-[#A8988B]">{completionRate}% ของทั้งหมด</p>
        </div>

        {/* Metric 3: รอตรวจ */}
        <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-2xs space-y-1">
          <p className="text-xs text-[#7A6A5C] flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            รอตรวจ
          </p>
          <p className="text-2xl font-extrabold text-blue-600">{pendingGradingCount}</p>
          <p className="text-[10px] text-[#A8988B]">รอครูให้คะแนน</p>
        </div>

        {/* Metric 4: ยังไม่ได้ส่ง */}
        <div className="bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-2xs space-y-1">
          <p className="text-xs text-[#7A6A5C] flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            ยังไม่ได้ส่ง
          </p>
          <p className="text-2xl font-extrabold text-amber-600">{unsubmittedCount}</p>
          <p className="text-[10px] text-[#A8988B]">ต้องส่งตามกำหนด</p>
        </div>

        {/* Metric 5: คะแนนสะสมรวม */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-1 bg-white rounded-2xl p-4 border border-[#EADBCC] shadow-2xs space-y-1">
          <p className="text-xs text-[#7A6A5C] flex items-center gap-1.5 font-medium">
            <Award className="w-3.5 h-3.5 text-[#B94E48]" />
            คะแนนสะสม
          </p>
          <p className="text-2xl font-extrabold text-[#B94E48]">
            {totalScoreEarned}
            <span className="text-xs text-[#7A6A5C] font-semibold ml-1">
              / {totalMaxScoreGraded}
            </span>
          </p>
          <p className="text-[10px] text-emerald-700 font-bold">
            {totalMaxScoreGraded > 0
              ? `${Math.round((totalScoreEarned / totalMaxScoreGraded) * 100)}% ผลสัมฤทธิ์`
              : "ยังไม่มีงานที่ตรวจ"}
          </p>
        </div>
      </div>

      {/* 3. Progress Chart for Student Scores */}
      <StudentProgressChart
        title="แนวโน้มพัฒนาการคะแนนและผลงานของฉัน"
        subtitle="เปรียบเทียบคะแนนที่ได้รับในแต่ละภาระงานเทียบกับเกณฑ์คะแนนเต็ม"
        scores={studentScores}
      />

      {/* 4. Upcoming Deadlines & Recent Graded Feedback Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming Deadlines Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-3">
            <h2 className="font-bold text-[#3F342B] text-sm sm:text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#C96B4B]" />
              งานด่วนใกล้ถึงกำหนดส่ง (Upcoming)
            </h2>
            <Link
              href="/student/assignments?status=PENDING"
              className="text-xs font-semibold text-[#8C5D23] hover:text-[#B94E48] transition-colors"
            >
              ดูทั้งหมด →
            </Link>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="p-8 text-center text-[#7A6A5C] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold">ยอดเยี่ยมมาก! ไม่มีงานค้างส่งในขณะนี้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map((assignment) => {
                const isPastDue = Date.now() > new Date(assignment.dueDate).getTime();

                return (
                  <div
                    key={assignment.id}
                    className="p-3.5 bg-[#FAF6F0] rounded-2xl border border-[#EADBCC] flex items-center justify-between gap-3 hover:border-[#D9A441] transition-all"
                  >
                    <div className="space-y-0.5 overflow-hidden">
                      <h4 className="text-xs font-bold text-[#3F342B] truncate">
                        {assignment.title}
                      </h4>
                      <p className="text-[11px] text-[#7A6A5C] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#C96B4B]" />
                        กำหนดส่ง:{" "}
                        {new Date(assignment.dueDate).toLocaleDateString("th-TH", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isPastDue && (
                          <span className="text-[10px] text-red-600 font-bold ml-1">
                            (เลยกำหนดแล้ว)
                          </span>
                        )}
                      </p>
                    </div>

                    <Link
                      href={`/student/assignments/${assignment.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#D9A441] hover:bg-[#C28F30] text-white text-xs font-bold shrink-0 transition-colors shadow-2xs"
                    >
                      <span>ส่งงาน</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Graded Feedback Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-3">
            <h2 className="font-bold text-[#3F342B] text-sm sm:text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-[#D9A441]" />
              ผลการประเมินและคำติชมล่าสุด
            </h2>
            <Link
              href="/student/assignments?status=GRADED"
              className="text-xs font-semibold text-[#8C5D23] hover:text-[#B94E48] transition-colors"
            >
              ดูทั้งหมด →
            </Link>
          </div>

          {recentGraded.length === 0 ? (
            <div className="p-8 text-center text-[#7A6A5C] space-y-2">
              <Clock className="w-8 h-8 text-[#A8988B] mx-auto" />
              <p className="text-xs font-semibold">ยังไม่มีผลงานที่ได้รับการตรวจให้คะแนน</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentGraded.map((assignment) => {
                const grade = assignment.submissions[0]?.grade;

                return (
                  <div
                    key={assignment.id}
                    className="p-3.5 bg-[#FFF9F0] rounded-2xl border border-[#EADBCC] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-[#3F342B] truncate">
                        {assignment.title}
                      </h4>
                      <span className="text-xs font-extrabold text-[#B94E48] bg-white px-2 py-0.5 rounded-lg border border-[#EADBCC] shrink-0">
                        {grade?.score} / {assignment.maxScore} คะแนน
                      </span>
                    </div>

                    {grade?.feedback ? (
                      <p className="text-[11px] text-[#5A4D41] bg-white p-2.5 rounded-xl border border-[#EADBCC] italic leading-relaxed">
                        💬 &quot;{grade.feedback}&quot;
                      </p>
                    ) : (
                      <p className="text-[10px] text-[#A8988B] italic">
                        (ไม่มีบันทึกข้อเสนอแนะเพิ่มเติม)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
