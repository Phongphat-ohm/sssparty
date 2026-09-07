import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { getSystemSettings } from "@/lib/settings/system-settings";
import { AdminLayoutShell } from "@/components/admin/AdminLayoutShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const [adminUser, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        adminRole: true,
        permissions: true,
        status: true,
      },
    }),
    getSystemSettings(),
  ]);

  if (!adminUser || adminUser.status !== "ACTIVE") {
    redirect("/admin-login");
  }

  return (
    <AdminLayoutShell
      adminName={session.username}
      adminRole={adminUser.adminRole}
      permissions={adminUser.permissions}
      academicTerm={settings.academic_term}
      maintenanceMode={settings.maintenance_mode}
    >
      {children}
    </AdminLayoutShell>
  );
}

