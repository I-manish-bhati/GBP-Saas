import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * D1 + D6: every cron/job route is private — it must receive
 * `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron sends this header
 * automatically when CRON_SECRET is configured; QStash/manual runs pass it
 * explicitly). Returns the response to send when denied (401 on a wrong
 * bearer, 503 when CRON_SECRET isn't set), or null when authorized.
 * Comparison is timing-safe.
 */
export function requireCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Cron is not configured." },
      { status: 503 }
    );
  }
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
