import argon2 from "argon2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { signSession } from "@/lib/auth/jwt";
import { setSessionToken } from "@/lib/auth/cookies";
import { clientIp, jsonError, rateLimitResponse } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Same timing-equalization trick as owner login.
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$hl8VLYCNIYas7BO12LQ2ug$m1NOuLG0Ff0lySxQQl2eLPHY0zYLSIwDg4N4FMzTWpA";

const schema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(72),
});

export async function POST(req: Request) {
  const ipLimit = await rateLimit({
    bucket: "admin:login:ip",
    key: clientIp(req),
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
  if (!parsed.success) return jsonError(401, "Invalid email or password.");

  const { email, password } = parsed.data;

  const emailLimit = await rateLimit({
    bucket: "admin:login:email",
    key: email,
    limit: 5,
    windowMs: 15 * 60_000,
  });
  if (!emailLimit.success) return rateLimitResponse(emailLimit);

  const { data } = await db
    .from("admins")
    .select("id, password_hash, is_active")
    .eq("email", email)
    .limit(1);

  const admin = data?.[0];
  const passwordOk = await argon2.verify(admin?.password_hash ?? DUMMY_HASH, password);

  if (!admin || !passwordOk || !admin.is_active) {
    return jsonError(401, "Invalid email or password.");
  }

  const token = await signSession(admin.id, "admin");
  await setSessionToken("admin", token);

  return NextResponse.json({ ok: true });
}
