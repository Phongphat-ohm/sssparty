import { getSystemSettings } from "@/lib/settings/system-settings";
import { StudentLoginForm } from "@/components/student/StudentLoginForm";

export const dynamic = "force-dynamic";

export default async function StudentLoginPage() {
  const settings = await getSystemSettings();

  return <StudentLoginForm settings={settings} />;
}
