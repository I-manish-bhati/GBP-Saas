import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consumeAuthToken } from "@/lib/auth/tokens";
import { clientIp, jsonError, rateLimitResponse } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Email links are always GET. Valid token → verify, then land on /login.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  const limited = await rateLimit({
    bucket: "auth:verify-email",
    key: clientIp(req),
    limit: 30,
    windowMs: 10 * 60_000,
  });
  if (!limited.success) return rateLimitResponse(limited);

  const redirect = (param: string) =>
    NextResponse.redirect(new URL(`/login?${param}`, url.origin));

  if (!token) return redirect("verify_error=1");

  const ownerId = await consumeAuthToken("email_verify", token);
  if (!ownerId) return redirect("verify_error=1");

  const { error } = await db
    .from("owners")
    .update({ email_verified: true })
    .eq("id", ownerId)
    .eq("email_verified", false);

  if (error) {
    console.error("[verify-email] update failed:", error.message);
    return jsonError(500, "Could not verify the email. Please try again.");
  }

  return redirect("verified=1");
}
