import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/auth/permissions-server";
import { getAuditLogsAction } from "@/actions/audit";
import { AuditLogsClient } from "@/components/admin/AuditLogsClient";

export default async function AdminLogsPage() {
  const authCheck = await requireAdminPermission("VIEW_AUDIT_LOGS");
  if (!authCheck.ok) {
    redirect("/admin/dashboard");
  }

  const initialData = await getAuditLogsAction({ page: 1, pageSize: 20 });

  return (
    <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto">
      <AuditLogsClient initialData={initialData} />
    </div>
  );
}
