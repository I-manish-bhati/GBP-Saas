import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/jwt";

// Fail-closed: everything under /api/* requires an owner session UNLESS
// listed here. Update this list in the milestone that adds the route (M8
// webhooks/cron, M9 customer QR endpoints) — never leave a public route off it.
const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/webhooks/",
  "/api/cron/",
  "/api/qr/",
  "/api/review-submissions",
];

// Admin surface (FR-43): separate cookie, separate JWT secret, own routes —
// an owner token can never open /admin and an admin token never opens /dashboard.
const ADMIN_PUBLIC = ["/admin/login", "/admin/api/auth/login"];

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isAdminPath(pathname)) {
    if (ADMIN_PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.next();
    }
    const token = req.cookies.get("admin_session")?.value;
    const claims = token ? await verifySession(token, "admin") : null;
    if (claims) return NextResponse.next();
    if (pathname.startsWith("/admin/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const adminLogin = new URL("/admin/login", req.url);
    adminLogin.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(adminLogin);
  }

  const isApi = pathname.startsWith("/api/");
  if (isApi && PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("owner_session")?.value;
  const claims = token ? await verifySession(token, "owner") : null;
  if (claims) return NextResponse.next();

  if (isApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*", "/admin/:path*"],
};
