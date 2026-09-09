/**
 * เครื่องมือจัดการและ Resolve Base URL ของระบบอย่างปลอดภัย
 * รองรับทั้ง Local development, Vercel Preview, Custom Domain และ Reverse Proxy
 */
export function getAppBaseUrl(overrideUrl?: string): string {
  if (overrideUrl) {
    return overrideUrl.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
