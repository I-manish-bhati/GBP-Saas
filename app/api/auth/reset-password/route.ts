import argon2 from "argon2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeAuthToken } from "@/lib/auth/tokens";
import { clientIp, jsonError, rateLimitResponse } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(32).max(128),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters."),
});

export async function POST(req: Request) {
  const ip = clientIp(req);

  const ipLimit = await rateLimit({
    bucket: "auth:reset:ip",
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
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const ownerId = await consumeAuthToken("password_reset", parsed.data.token);
  if (!ownerId) {
    return jsonError(400, "This reset link is invalid or has expired. Request a new one.");
  }

  const passwordHash = await argon2.hash(parsed.data.password, { type: argon2.argon2id });
  const { error } = await db
    .from("owners")
    .update({ password_hash: passwordHash })
    .eq("id", ownerId);

  if (error) {
    console.error("[reset-password] update failed:", error.message);
    return jsonError(500, "Could not update the password. Please try again.");
  }

  return NextResponse.json({ ok: true });
}
