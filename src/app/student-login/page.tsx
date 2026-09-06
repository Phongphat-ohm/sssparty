import { getSystemSettings } from "@/lib/settings/system-settings";
import { StudentLoginForm } from "@/components/student/StudentLoginForm";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function StudentLoginPage(props: PageProps) {
  const { redirect: redirectUrl } = (await props.searchParams) || {};
  const settings = await getSystemSettings();

  return <StudentLoginForm settings={settings} redirectUrl={redirectUrl} />;
}
