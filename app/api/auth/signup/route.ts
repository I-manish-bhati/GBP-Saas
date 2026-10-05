import argon2 from "argon2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { issueAuthToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { clientIp, jsonError, rateLimitResponse } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters."),
  name: z.string().trim().max(100).optional(),
});

export async function POST(req: Request) {
  const limited = await rateLimit({
    bucket: "auth:signup",
    key: clientIp(req),
    limit: 5,
    windowMs: 15 * 60_000,
  });
  if (!limited.success) return rateLimitResponse(limited);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid request body.");
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { email, password, name } = parsed.data;
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const { data: owner, error } = await db
    .from("owners")
    .insert({ email, password_hash: passwordHash, name: name ?? null, email_verified: false })
    .select("id, email")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError(409, "An account with this email already exists.");
    }
    console.error("[signup] insert failed:", error.message);
    return jsonError(500, "Could not create the account. Please try again.");
  }

  try {
    const { raw } = await issueAuthToken(owner.id, "email_verify");
    await sendVerificationEmail(owner.email, raw);
  } catch (e) {
    // Account exists; verification email can be resent from the dashboard prompt.
    console.error("[signup] verification email failed:", e);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
