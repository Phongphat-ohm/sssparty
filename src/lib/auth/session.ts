import { cookies } from "next/headers";
import { AuthTokenPayload, verifyAuthToken } from "./jwt";

export const AUTH_COOKIE_NAME = "auth_token";

/**
 * บันทึก JWT ลงใน Cookie ที่มีความปลอดภัยสูง (httpOnly, secure, sameSite: lax)
 */
export async function setAuthSession(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * ดึง Session ปัจจุบันและถอดรหัสตรวจสอบความถูกต้องของ Token
 */
export async function getAuthSession(): Promise<AuthTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifyAuthToken(token);
}

/**
 * ลบ Cookie เพื่อนำผู้ใช้ออกจากระบบ (Logout)
 */
export async function clearAuthSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
