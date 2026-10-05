import argon2 from "argon2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { signSession } from "@/lib/auth/jwt";
import { setSessionToken } from "@/lib/auth/cookies";
import { clientIp, jsonError, rateLimitResponse } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Valid argon2id hash of a throwaway string — verified against when the email
// doesn't exist so unknown-email and wrong-password take the same time.
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$hl8VLYCNIYas7BO12LQ2ug$m1NOuLG0Ff0lySxQQl2eLPHY0zYLSIwDg4N4FMzTWpA";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(72),
});

export async function POST(req: Request) {
  const ip = clientIp(req);

  const ipLimit = await rateLimit({
    bucket: "auth:login:ip",
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
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return jsonError(401, "Invalid email or password.");

  const { email, password } = parsed.data;

  const emailLimit = await rateLimit({
    bucket: "auth:login:email",
    key: email,
    limit: 5,
    windowMs: 15 * 60_000,
  });
  if (!emailLimit.success) return rateLimitResponse(emailLimit);

  const { data } = await db
    .from("owners")
    .select("id, password_hash, email_verified, suspended_at")
    .eq("email", email)
    .limit(1);

  const owner = data?.[0];
  const passwordOk = await argon2.verify(owner?.password_hash ?? DUMMY_HASH, password);

  if (!owner || !passwordOk) {
    return jsonError(401, "Invalid email or password.");
  }
  if (owner.suspended_at) {
    return jsonError(403, "This account has been suspended. Please contact support.");
  }

  const token = await signSession(owner.id, "owner");
  await setSessionToken("owner", token);

  return NextResponse.json({ ok: true, emailVerified: owner.email_verified });
}
