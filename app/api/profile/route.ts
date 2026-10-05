import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty.")
    .max(80, "Name must be at most 80 characters."),
});

/** PATCH /api/profile — update the signed-in owner's display name. */
export async function PATCH(req: Request) {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit({
    bucket: "profile:edit",
    key: claims.sub,
    limit: 20,
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

  const { error } = await db
    .from("owners")
    .update({ name: parsed.data.name })
    .eq("id", claims.sub);
  if (error) {
    console.error("[profile] name update failed:", error.message);
    return NextResponse.json(
      { error: "Could not save the name. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, name: parsed.data.name });
}
