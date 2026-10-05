import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { rateLimit } from "@/lib/rate-limit";
import {
  getNotificationPrefs,
  mergePrefs,
  type NotificationPrefs,
} from "@/lib/notify";

export const runtime = "nodejs";

const schema = z.object({
  email: z.boolean().optional(),
  inApp: z
    .object({
      post_ready: z.boolean().optional(),
      token_expired: z.boolean().optional(),
      payment_failed: z.boolean().optional(),
      post_failed: z.boolean().optional(),
    })
    .optional(),
});

async function authorize(): Promise<{ sub: string } | null> {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  return claims ? { sub: claims.sub } : null;
}

/** GET /api/profile/notifications — merged prefs (defaults applied). */
export async function GET() {
  const claims = await authorize();
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prefs = await getNotificationPrefs(claims.sub);
  return NextResponse.json({ prefs });
}

/** PATCH /api/profile/notifications — merge partial prefs and persist. */
export async function PATCH(req: Request) {
  const claims = await authorize();
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await rateLimit({
    bucket: "notif-prefs",
    key: claims.sub,
    limit: 30,
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

  const existing = await getNotificationPrefs(claims.sub);
  const next: NotificationPrefs = {
    email: parsed.data.email ?? existing.email,
    inApp: { ...existing.inApp, ...parsed.data.inApp },
  };

  const { error } = await db
    .from("owners")
    .update({ notification_prefs: next })
    .eq("id", claims.sub);
  if (error) {
    console.error("[notif-prefs] update failed:", error.message);
    return NextResponse.json(
      { error: "Could not save preferences. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ prefs: mergePrefs(next) });
}
