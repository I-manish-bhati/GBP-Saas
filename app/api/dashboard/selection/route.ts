import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { safeNextPath } from "@/lib/client-api";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COOKIE_NAME = "dash_loc";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * FR-20: persist the dashboard location selection (switcher target).
 * GET with redirect so it works as a plain navigation:
 *   ?loc=<uuid> → set cookie (must be an owner location)
 *   ?loc=all    → clear cookie
 * Invalid / foreign ids fall back to the aggregate view.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const loc = url.searchParams.get("loc");
  const next = safeNextPath(url.searchParams.get("next") ?? "/dashboard");

  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) {
    return NextResponse.redirect(
      new URL("/login?next=%2Fdashboard", req.url)
    );
  }

  const jar = await cookies();

  if (!loc || loc === "all") {
    jar.delete(COOKIE_NAME);
    return NextResponse.redirect(new URL(next, req.url));
  }

  if (UUID_RE.test(loc)) {
    const { data } = await db
      .from("locations")
      .select("id")
      .eq("id", loc)
      .eq("owner_id", claims.sub)
      .limit(1);
    if (data && data.length > 0) {
      jar.set(COOKIE_NAME, loc, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
      return NextResponse.redirect(new URL(next, req.url));
    }
  }

  jar.delete(COOKIE_NAME);
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
