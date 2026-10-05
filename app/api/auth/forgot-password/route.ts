import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { issueAuthToken } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { clientIp, jsonError, rateLimitResponse } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});

// Always responds ok — whether the email exists is never revealed (FR-5).
export async function POST(req: Request) {
  const ip = clientIp(req);

  const ipLimit = await rateLimit({
    bucket: "auth:forgot:ip",
    key: ip,
    limit: 10,
    windowMs: 15 * 60_000,
  });
  if (!ipLimit.success) return rateLimitResponse(ipLimit);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid request body.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Enter a valid email address.");

  const emailLimit = await rateLimit({
    bucket: "auth:forgot:email",
    key: parsed.data.email,
    limit: 3,
    windowMs: 60 * 60_000,
  });
  if (!emailLimit.success) return rateLimitResponse(emailLimit);

  const { data: owner } = await db
    .from("owners")
    .select("id, email, suspended_at")
    .eq("email", parsed.data.email)
    .limit(1);

  if (owner && owner.length > 0 && !owner[0].suspended_at) {
    try {
      const { raw } = await issueAuthToken(owner[0].id, "password_reset");
      await sendPasswordResetEmail(owner[0].email, raw);
    } catch (e) {
      console.error("[forgot-password] email failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
