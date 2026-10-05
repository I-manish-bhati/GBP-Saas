import { NextResponse } from "next/server";
import { z } from "zod";
import argon2 from "argon2";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(200),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password must be at most 100 characters."),
});

export async function POST(req: Request) {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit({
    bucket: "pwchange:owner",
    key: claims.sub,
    limit: 10,
    windowMs: 24 * 60 * 60_000,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { data } = await db
    .from("owners")
    .select("password_hash")
    .eq("id", claims.sub)
    .limit(1);
  const hash = data?.[0]?.password_hash;
  if (!hash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let currentOk = false;
  try {
    currentOk = await argon2.verify(hash, parsed.data.currentPassword);
  } catch {
    currentOk = false;
  }
  if (!currentOk) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 }
    );
  }

  const newHash = await argon2.hash(parsed.data.newPassword, {
    type: argon2.argon2id,
  });
  const { error } = await db
    .from("owners")
    .update({ password_hash: newHash })
    .eq("id", claims.sub);
  if (error) {
    console.error("[change-password] update failed:", error.message);
    return NextResponse.json(
      { error: "Could not update the password. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
