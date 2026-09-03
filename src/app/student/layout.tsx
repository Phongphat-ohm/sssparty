import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { StudentNavbar } from "@/components/student/StudentNavbar";
import { StudentBottomNav } from "@/components/student/StudentBottomNav";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session || session.role !== "STUDENT") {
    redirect("/student-login");
  }

  const studentName = session.name || session.username;
  const studentCode = session.studentCode || "";
  const className = session.className || "";
  const studentNumber = session.studentNumber || 0;

  return (
    <div className="min-h-screen bg-[#FFF9F0] flex flex-col justify-between">
      <div>
        <StudentNavbar
          studentName={studentName}
          studentCode={studentCode}
          className={className}
          studentNumber={studentNumber}
        />
        <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 pb-24 md:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <StudentBottomNav
        studentName={studentName}
        className={className}
        studentNumber={studentNumber}
      />
    </div>
  );
}
