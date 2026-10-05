import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { safeReviewNext, type CustomerStatePayload } from "../_lib";

export const runtime = "nodejs";

const STATE_COOKIE = "cust_oauth_state";
const STATE_TTL_SECONDS = 60 * 10;
const SCOPE = "openid email profile";

/**
 * M9 customer login (Client B): PKCE + state persisted in a short-lived
 * httpOnly cookie (customers have no owner FK to hang an oauth_sessions row
 * on). Redirects back to the `/r/{slug}` page after callback.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const clientId = process.env.GOOGLE_CUSTOMER_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      {
        error:
          "Customer Google login is not configured. Set GOOGLE_CUSTOMER_OAUTH_CLIENT_ID / GOOGLE_CUSTOMER_OAUTH_CLIENT_SECRET in .env.local.",
      },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const next = safeReviewNext(url.searchParams.get("next"));

  const state = randomBytes(32).toString("hex");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const payload: CustomerStatePayload = { state, verifier, next };
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, Buffer.from(JSON.stringify(payload)).toString("base64url"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/customer-google",
    maxAge: STATE_TTL_SECONDS,
  });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set(
    "redirect_uri",
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/customer-google/callback`
  );
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPE);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(authUrl.toString());
}
