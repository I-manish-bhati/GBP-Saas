import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { signSession } from "@/lib/auth/jwt";
import { setSessionToken } from "@/lib/auth/cookies";
import {
  safeReviewNext,
  type CustomerStatePayload,
} from "../_lib";

export const runtime = "nodejs";

const STATE_COOKIE = "cust_oauth_state";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

function fail(message: string, next?: string): NextResponse {
  const target = new URL(
    safeReviewNext(next ?? null),
    process.env.APP_URL ?? "http://localhost:3000"
  );
  target.searchParams.set("login_error", message);
  return NextResponse.redirect(target);
}

async function exchangeCode(body: Record<string, string>): Promise<{
  access_token?: string;
} | null> {
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as { access_token?: string };
  } catch {
    return null;
  }
}

/**
 * M9 Client B callback: verifies state from the httpOnly cookie (single-use),
 * exchanges the code (PKCE), upserts `customers` by google_sub (NFR-4) and
 * issues the `customer_session` JWT — then returns to the QR page.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const clientId = process.env.GOOGLE_CUSTOMER_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CUSTOMER_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("login not configured");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(STATE_COOKIE)?.value;
  // Single use — clear regardless of outcome.
  cookieStore.set(STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/customer-google",
    maxAge: 0,
  });
  if (!rawCookie) return fail("login session expired");
  let payload: CustomerStatePayload;
  try {
    payload = JSON.parse(Buffer.from(rawCookie, "base64url").toString("utf8")) as CustomerStatePayload;
  } catch {
    return fail("login session invalid");
  }
  if (oauthError) return fail(oauthError, payload.next);
  if (!code || !state || state !== payload.state) return fail("state mismatch", payload.next);

  const tokens = await exchangeCode({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/customer-google/callback`,
    grant_type: "authorization_code",
    code_verifier: payload.verifier,
  });
  if (!tokens?.access_token) return fail("token exchange failed", payload.next);

  interface OidcProfile {
    sub?: string;
    email?: string;
    name?: string;
  }
  let profile: OidcProfile | null = null;
  try {
    const res = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (res.ok) profile = (await res.json()) as OidcProfile;
  } catch {
    profile = null;
  }
  if (!profile?.sub) return fail("could not read profile", payload.next);

  const { data: rows, error } = await db
    .from("customers")
    .upsert(
      {
        google_sub: profile.sub,
        email: profile.email ?? null,
        name: profile.name ?? profile.email ?? null,
      },
      { onConflict: "google_sub" }
    )
    .select("id");
  if (error || !rows || rows.length === 0) {
    console.error("[customer-google] customer upsert failed:", error?.message);
    return fail("account error", payload.next);
  }

  const token = await signSession(rows[0].id, "customer");
  await setSessionToken("customer", token);

  return NextResponse.redirect(
    new URL(safeReviewNext(payload.next), process.env.APP_URL ?? "http://localhost:3000")
  );
}
