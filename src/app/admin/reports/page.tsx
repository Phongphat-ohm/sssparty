import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/auth/permissions-server";
import { getGeneratedReportsAction } from "@/actions/reports-history";
import { getAdminTermContext } from "@/lib/terms/term-service";
import { ReportHistoryClient } from "@/components/admin/ReportHistoryClient";

export default async function AdminReportsPage() {
  const authCheck = await requireAdminPermission("VIEW_REPORTS");
  if (!authCheck.ok) {
    redirect("/admin/dashboard");
  }

  const termContext = await getAdminTermContext();
  const initialData = await getGeneratedReportsAction({
    page: 1,
    pageSize: 15,
    academicTerm: termContext.selectedTerm,
  });

  return (
    <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto">
      <ReportHistoryClient
        initialData={initialData}
        currentSelectedTerm={termContext.selectedTerm}
        availableTerms={termContext.availableTerms}
      />
    </div>
  );
}
