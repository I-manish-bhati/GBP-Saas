import { NextResponse } from "next/server";
import { z } from "zod";
import argon2 from "argon2";
import { db } from "@/lib/db";
import { getSessionToken, clearSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  password: z.string().min(1, "Enter your password.").max(200),
  confirm: z.string().refine((v) => v === "DELETE", {
    message: 'Type "DELETE" to confirm.',
  }),
});

/**
 * DELETE /api/account — permanently delete the signed-in owner. Every owner-
 * scoping FK (locations, subscriptions, payments, notifications, oauth
 * sessions, AI logs) is ON DELETE CASCADE, so a single owners row delete
 * removes the whole account (verified against migrations 0001/0005/0008).
 * Requires the current password + typed "DELETE" confirmation.
 */
export async function DELETE(req: Request) {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit({
    bucket: "account:delete",
    key: claims.sub,
    limit: 5,
    windowMs: 10 * 60_000,
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

  let passwordOk = false;
  try {
    passwordOk = await argon2.verify(hash, parsed.data.password);
  } catch {
    passwordOk = false;
  }
  if (!passwordOk) {
    return NextResponse.json(
      { error: "Password is incorrect." },
      { status: 400 }
    );
  }

  const { error } = await db.from("owners").delete().eq("id", claims.sub);
  if (error) {
    console.error("[account] delete failed:", error.message);
    return NextResponse.json(
      { error: "Could not delete the account. Please try again." },
      { status: 500 }
    );
  }

  await clearSessionToken("owner");
  return NextResponse.json({ ok: true });
}
