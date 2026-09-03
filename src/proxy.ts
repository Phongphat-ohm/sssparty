import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/auth/jwt";

export const config = {
  matcher: [
    "/admin/:path*",
    "/student/:path*",
    "/admin-login",
    "/student-login",
    "/api/:path*",
  ],
};

function attachSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; media-src 'self' blob: https:; font-src 'self' data:; frame-src 'self' blob: https:; connect-src 'self' https:; frame-ancestors 'self';"
  );
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  // 1. ตรวจสอบการเข้าถึงพื้นที่ Admin (/admin/*)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin-login")) {
    if (!payload || payload.role !== "ADMIN") {
      const loginUrl = new URL("/admin-login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const res = NextResponse.redirect(loginUrl);
      return attachSecurityHeaders(res);
    }
  }

  // 2. ตรวจสอบการเข้าถึงพื้นที่นักเรียน (/student/*)
  if (pathname.startsWith("/student") && !pathname.startsWith("/student-login")) {
    if (!payload || payload.role !== "STUDENT") {
      const loginUrl = new URL("/student-login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const res = NextResponse.redirect(loginUrl);
      return attachSecurityHeaders(res);
    }
  }

  // 3. ป้องกันผู้ใช้ที่ล็อกอินแล้วเข้าหน้า Login ซ้ำ
  if (pathname === "/admin-login") {
    if (payload?.role === "ADMIN") {
      return attachSecurityHeaders(NextResponse.redirect(new URL("/admin/dashboard", request.url)));
    }
    if (payload?.role === "STUDENT") {
      return attachSecurityHeaders(NextResponse.redirect(new URL("/student/dashboard", request.url)));
    }
  }

  if (pathname === "/student-login") {
    if (payload?.role === "STUDENT") {
      return attachSecurityHeaders(NextResponse.redirect(new URL("/student/dashboard", request.url)));
    }
    if (payload?.role === "ADMIN") {
      return attachSecurityHeaders(NextResponse.redirect(new URL("/admin/dashboard", request.url)));
    }
  }

  const response = NextResponse.next();
  return attachSecurityHeaders(response);
}

export default proxy;
