import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin-login");
  }

  return (
    <div className="h-screen h-dvh bg-[#FFF9F0] flex flex-col md:flex-row overflow-hidden">
      <AdminSidebar adminName={session.username} />
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <AdminNavbar adminName={session.username} />
        <main className="flex-1 min-w-0 h-full overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  );
}
