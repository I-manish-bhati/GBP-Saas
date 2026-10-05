import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { issueAuthToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { clientIp, jsonError, rateLimitResponse } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});

// Always responds ok — no way to tell whether the email exists (FR-4 resend).
export async function POST(req: Request) {
  const ip = clientIp(req);

  const ipLimit = await rateLimit({
    bucket: "auth:resend-verify:ip",
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
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Enter a valid email address.");

  const emailLimit = await rateLimit({
    bucket: "auth:resend-verify:email",
    key: parsed.data.email,
    limit: 3,
    windowMs: 60 * 60_000,
  });
  if (!emailLimit.success) return rateLimitResponse(emailLimit);

  const { data: owner } = await db
    .from("owners")
    .select("id, email, email_verified")
    .eq("email", parsed.data.email)
    .limit(1);

  if (owner && owner.length > 0 && !owner[0].email_verified) {
    try {
      const { raw } = await issueAuthToken(owner[0].id, "email_verify");
      await sendVerificationEmail(owner[0].email, raw);
    } catch (e) {
      console.error("[resend-verification] failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
