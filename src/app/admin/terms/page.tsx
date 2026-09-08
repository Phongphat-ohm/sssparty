import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { getAllAcademicTermsWithStats } from "@/lib/terms/term-service";
import { AcademicTermsClient } from "@/components/admin/AcademicTermsClient";

export const dynamic = "force-dynamic";

export default async function AdminTermsPage() {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN" || !session.userId) {
    redirect("/admin-login");
  }

  const [user, terms] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        role: true,
        adminRole: true,
        permissions: true,
      },
    }),
    getAllAcademicTermsWithStats(),
  ]);

  if (!user) {
    redirect("/admin-login");
  }

  const canManageSettings = hasAdminPermission(user, "MANAGE_SETTINGS");

  return (
    <AcademicTermsClient
      initialTerms={terms}
      canManageSettings={canManageSettings}
    />
  );
}
