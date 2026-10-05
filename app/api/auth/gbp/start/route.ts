import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { requireOwner, isAuthResponse } from "@/lib/auth/guards";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATE_COOKIE = "gbp_oauth_state";
const STATE_TTL_SECONDS = 60 * 10;
const SCOPE =
  "https://www.googleapis.com/auth/business.manage openid email profile";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function errorRedirect(req: Request, message: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/dashboard?gbp_error=${encodeURIComponent(message)}`, req.url)
  );
}

/**
 * FR-6: start the GBP OAuth dance (Client A, scope business.manage).
 * Generates cryptographically random state + PKCE verifier, persists them
 * server-side (single-use, 10 min), sets a short-lived httpOnly state cookie
 * and redirects to Google's consent screen.
 *
 * `?location_id=` = reconnect flow for an existing location (FR-10).
 */
export async function GET(req: Request) {
  const guard = await requireOwner({ requireVerified: true });
  if (isAuthResponse(guard)) return guard;
  const { ownerId } = guard;

  const clientId = process.env.GOOGLE_OWNER_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OWNER_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          "Google OAuth is not configured. Set GOOGLE_OWNER_OAUTH_CLIENT_ID / GOOGLE_OWNER_OAUTH_CLIENT_SECRET in .env.local.",
      },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const locationParam = url.searchParams.get("location_id");
  let reconnectLocationId: string | null = null;
  if (locationParam) {
    if (!UUID_RE.test(locationParam)) return errorRedirect(req, "bad location");
    const { data } = await db
      .from("locations")
      .select("id")
      .eq("id", locationParam)
      .eq("owner_id", ownerId)
      .limit(1);
    if (!data || data.length === 0) return errorRedirect(req, "bad location");
    reconnectLocationId = locationParam;
  }

  const state = randomBytes(32).toString("hex");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  // Opportunistic cleanup of this owner's stale sessions.
  await db
    .from("oauth_sessions")
    .delete()
    .eq("owner_id", ownerId)
    .lt("expires_at", new Date().toISOString());

  const { error: insErr } = await db.from("oauth_sessions").insert({
    state_hash: sha256Hex(state),
    owner_id: ownerId,
    code_verifier: verifier,
    reconnect_location_id: reconnectLocationId,
    expires_at: new Date(Date.now() + STATE_TTL_SECONDS * 1000).toISOString(),
  });
  if (insErr) {
    console.error("[gbp/start] insert failed:", insErr.message);
    return errorRedirect(req, "session error");
  }

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/gbp",
    maxAge: STATE_TTL_SECONDS,
  });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set(
    "redirect_uri",
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/gbp/callback`
  );
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPE);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");

  return NextResponse.redirect(authUrl.toString());
}
