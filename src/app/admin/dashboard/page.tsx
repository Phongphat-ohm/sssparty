import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import {
  BookOpen,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  PlusCircle,
  ClipboardCheck,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  GraduationCap,
  BarChart3,
  UserCog,
} from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { AssignmentCompletionBarChart } from "@/components/charts/AssignmentCompletionBarChart";
import { ScoreDistributionChart } from "@/components/charts/ScoreDistributionChart";

export default async function AdminDashboardPage() {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin-login");
  }

  // ดึงข้อมูลสถิติทั้งหมดแบบขนาน
  const [
    activeStudentsCount,
    totalAssignmentsCount,
    publishedAssignmentsCount,
    pendingSubmissionsCount,
    gradedSubmissionsCount,
    recentPendingSubmissions,
    studentsByClass,
    publishedAssignments,
    allSubmissions,
  ] = await Promise.all([
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.assignment.count(),
    prisma.assignment.count({ where: { status: "PUBLISHED" } }),
    prisma.submission.count({
      where: { status: { in: ["SUBMITTED", "LATE"] } },
    }),
    prisma.submission.count({ where: { status: "GRADED" } }),
    // งานที่รอการตรวจ 4 ชิ้นล่าสุด
    prisma.submission.findMany({
      where: { status: { in: ["SUBMITTED", "LATE"] } },
      include: {
        student: true,
        assignment: { select: { title: true, maxScore: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 4,
    }),
    // สรุปแยกตามห้องเรียน
    prisma.student.groupBy({
      by: ["className"],
      _count: { id: true },
      where: { status: "ACTIVE" },
    }),
    // การบ้านทั้งหมดที่เปิดรับส่ง
    prisma.assignment.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        maxScore: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // ชิ้นงานที่ส่งเข้ามาทั้งหมดเพื่อคำนวณแนวโน้มและช่วงคะแนน
    prisma.submission.findMany({
      select: {
        submittedAt: true,
        status: true,
        grade: { select: { score: true } },
        assignment: { select: { maxScore: true } },
      },
      orderBy: { submittedAt: "asc" },
    }),
  ]);

  // 1. คำนวณแนวโน้มการส่งงาน 7 วันล่าสุด (Submission Trend)
  const last7Days: { label: string; dateStr: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
    last7Days.push({ label, dateStr, value: 0 });
  }

  allSubmissions.forEach((sub) => {
    const subDate = new Date(sub.submittedAt).toISOString().split("T")[0];
    const found = last7Days.find((day) => day.dateStr === subDate);
    if (found) {
      found.value++;
    }
  });

  // 2. คำนวณการกระจายตัวของคะแนน (Score Distribution)
  const gradedList = allSubmissions.filter((s) => s.status === "GRADED" && s.grade);
  let excellent = 0; // 80-100%
  let veryGood = 0; // 70-79%
  let fair = 0; // 60-69%
  let needsWork = 0; // < 60%

  gradedList.forEach((s) => {
    const pct = ((s.grade?.score || 0) / (s.assignment.maxScore || 1)) * 100;
    if (pct >= 80) excellent++;
    else if (pct >= 70) veryGood++;
    else if (pct >= 60) fair++;
    else needsWork++;
  });

  const scoreBuckets = [
    { label: "ดีเยี่ยม", range: "80 - 100%", count: excellent, color: "#D9A441", badgeBg: "#FAF0E1" },
    { label: "ดีมาก", range: "70 - 79%", count: veryGood, color: "#10B981", badgeBg: "#ECFDF5" },
    { label: "ปานกลาง", range: "60 - 69%", count: fair, color: "#C96B4B", badgeBg: "#FFF5EE" },
    { label: "ต้องปรับปรุง", range: "< 60%", count: needsWork, color: "#B94E48", badgeBg: "#FEF2F2" },
  ];

  // 3. สถิติความสมบูรณ์ของการบ้านแต่ละชิ้น (Assignment Completion Stats)
  const assignmentCompletionStats = publishedAssignments.map((a) => ({
    id: a.id,
    title: a.title,
    submittedCount: a._count.submissions,
    totalStudents: activeStudentsCount,
    maxScore: a.maxScore,
  }));

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-6xl w-full mx-auto">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3F342B] tracking-tight flex items-center gap-2">
            <span>ภาพรวมระบบชุมนุมสื่อสร้างสรรค์</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF0E1] text-[#8C5D23] border border-[#EADBCC]">
              Admin Studio
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#7A6A5C]">
            ศูนย์ควบคุมภาระงาน สมาชิกชุมนุม และระบบตรวจผลงานแบบ Rubric
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#5A4D41] bg-white border border-[#D9CABB] hover:border-[#D9A441] hover:text-[#D9A441] transition-all shadow-2xs"
          >
            <UserCog className="w-4 h-4" />
            <span>จัดการผู้ใช้</span>
          </Link>

          <Link
            href="/admin/students"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#5A4D41] bg-white border border-[#D9CABB] hover:border-[#D9A441] hover:text-[#D9A441] transition-all shadow-2xs"
          >
            <Users className="w-4 h-4" />
            <span>จัดการนักเรียน</span>
          </Link>

          <Link
            href="/admin/assignments/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#B94E48] hover:bg-[#A33F39] active:scale-95 transition-all shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>สร้างการบ้านใหม่</span>
          </Link>
        </div>
      </div>

      {/* 2. Welcome Banner */}
      <div className="bg-gradient-to-r from-[#B94E48] via-[#C96B4B] to-[#D9A441] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            ผู้ดูแลระบบ • ครูผู้สอน
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            สวัสดี, อาจารย์ ({session.username}) 👋
          </h2>
          <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
            มีงานของนักเรียนที่ส่งเข้ามาและ<strong>รอการตรวจทั้งหมด {pendingSubmissionsCount} ชิ้น</strong>{" "}
            {pendingSubmissionsCount > 0 ? "สามารถคลิกเข้าตรวจงานด่วนได้ทันทีด้านล่าง" : "ตรวจครบถ้วนเรียบร้อยแล้ว"}
          </p>
        </div>
      </div>

      {/* 3. 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: สมาชิกชุมนุม */}
        <div className="bg-white rounded-2xl p-4.5 border border-[#EADBCC] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6A5C]">สมาชิกในชุมนุม</span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#3F342B]">{activeStudentsCount} คน</p>
          <Link
            href="/admin/students"
            className="text-[11px] font-semibold text-[#8C5D23] hover:underline inline-block"
          >
            ดูรายชื่อทั้งหมด →
          </Link>
        </div>

        {/* KPI 2: การบ้านทั้งหมด */}
        <div className="bg-white rounded-2xl p-4.5 border border-[#EADBCC] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6A5C]">การบ้านทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF6F0] text-[#C96B4B] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#3F342B]">{totalAssignmentsCount} งาน</p>
          <Link
            href="/admin/assignments"
            className="text-[11px] font-semibold text-[#8C5D23] hover:underline inline-block"
          >
            จัดการการบ้าน →
          </Link>
        </div>

        {/* KPI 3: งานที่เปิดรับส่งอยู่ */}
        <div className="bg-white rounded-2xl p-4.5 border border-[#EADBCC] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6A5C]">เปิดรับส่งอยู่</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700">{publishedAssignmentsCount} งาน</p>
          <p className="text-[11px] text-[#A8988B]">สถานะ Published</p>
        </div>

        {/* KPI 4: งานรอการตรวจ */}
        <div className="bg-white rounded-2xl p-4.5 border border-[#EADBCC] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6A5C]">รอการตรวจด่วน</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#B94E48] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#B94E48]">{pendingSubmissionsCount} ชิ้น</p>
          <Link
            href="/admin/submissions"
            className="text-[11px] font-semibold text-[#B94E48] hover:underline inline-block"
          >
            เปิดห้องตรวจงาน →
          </Link>
        </div>
      </div>

      {/* 4. Analytics & Graph Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Trend Line Chart */}
        <TrendLineChart
          title="แนวโน้มการส่งงานของนักเรียน (7 วันล่าสุด)"
          subtitle="สถิติจำนวนชิ้นงานที่นักเรียนอัปโหลดเข้าสู่ระบบรายวัน"
          data={last7Days}
          lineColor="#D9A441"
          unit="ชิ้น"
        />

        {/* Score Distribution Donut Chart */}
        <ScoreDistributionChart
          title="การกระจายตัวของคะแนนประเมิน (Grade Distribution)"
          subtitle="สัดส่วนผลคะแนนของนักเรียนที่ผ่านการตรวจให้คะแนนแล้ว"
          buckets={scoreBuckets}
        />
      </div>

      {/* 5. Assignment Completion Stats Bar Chart */}
      <AssignmentCompletionBarChart
        title="อัตราความสำเร็จการส่งงานแยกตามภาระงาน (Completion Rate)"
        subtitle="เปรียบเทียบสัดส่วนนักเรียนที่ส่งงานแล้วต่อจำนวนสมาชิกทั้งหมดในชุมนุม"
        assignments={assignmentCompletionStats}
      />

      {/* 6. Quick Grading Action Queue & Class Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick Grading Action Queue (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F2E8DC] pb-3">
            <h2 className="font-bold text-[#3F342B] text-base flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-[#B94E48]" />
              งานที่รอการตรวจล่าสุด (Quick Grading Queue)
            </h2>
            <Link
              href="/admin/submissions"
              className="text-xs font-semibold text-[#8C5D23] hover:text-[#B94E48] transition-colors"
            >
              ดูทั้งหมด ({pendingSubmissionsCount}) →
            </Link>
          </div>

          {recentPendingSubmissions.length === 0 ? (
            <div className="p-10 text-center text-[#7A6A5C] space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold">ไม่มีงานค้างตรวจในขณะนี้ ครูตรวจครบถ้วนแล้ว!</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F2E8DC]">
              {recentPendingSubmissions.map((sub) => {
                const isLate = sub.status === "LATE";

                return (
                  <div
                    key={sub.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs sm:text-sm text-[#3F342B] truncate">
                          {sub.student.firstName} {sub.student.lastName}
                        </strong>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-[#D9CABB] text-[#7A6A5C]">
                          {sub.student.className} #{sub.student.studentNumber}
                        </span>
                        {isLate ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                            ส่งล่าช้า
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ตรงเวลา
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#7A6A5C] truncate">
                        ภาระงาน: <span className="font-semibold text-[#5A4D41]">{sub.assignment.title}</span> •{" "}
                        ส่งเมื่อ:{" "}
                        {new Date(sub.submittedAt).toLocaleDateString("th-TH", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <Link
                      href={`/admin/submissions/${sub.id}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D9A441] hover:bg-[#C28F30] text-white text-xs font-bold transition-all shrink-0 shadow-2xs"
                    >
                      <span>เข้าตรวจ</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Class Breakdown Overview (1 Column) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EADBCC] shadow-xs space-y-4">
          <div className="border-b border-[#F2E8DC] pb-3">
            <h2 className="font-bold text-[#3F342B] text-base flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#D9A441]" />
              สัดส่วนสมาชิกแยกตามห้อง
            </h2>
            <p className="text-[11px] text-[#7A6A5C]">การกระจายตัวของสมาชิกชุมนุม</p>
          </div>

          <div className="space-y-3">
            {studentsByClass.map((cls) => {
              const percentage =
                activeStudentsCount > 0
                  ? Math.round((cls._count.id / activeStudentsCount) * 100)
                  : 0;

              return (
                <div key={cls.className} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#3F342B]">
                    <span>ห้อง {cls.className}</span>
                    <span className="text-[#7A6A5C]">
                      {cls._count.id} คน ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#FAF6F0] rounded-full overflow-hidden border border-[#EADBCC]">
                    <div
                      className="h-full bg-[#D9A441] rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#F2E8DC]">
            <Link
              href="/admin/students"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#FAF6F0] hover:bg-[#F2E8DC] text-xs font-semibold text-[#5A4D41] transition-colors border border-[#EADBCC]"
            >
              <span>จัดการรายชื่อและสิทธิ์สมาชิก</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
