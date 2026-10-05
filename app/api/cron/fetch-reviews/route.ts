import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCron } from "@/lib/auth/cron";
import { fetchReviewsHandler } from "@/lib/google/reviews";

export const runtime = "nodejs";

/**
 * D1 job — review sync (FR-11..13), every 30 min (vercel.json).
 * One pass per connected location; per-location try/catch (NFR-6). Each
 * GBP attempt is logged in `sync_logs` by `gbpFetch`; the stateless next
 * run retries cleanly. Scale note: shard per-location (QStash fan-out) if
 * the location count ever outgrows one serverless invocation.
 */
async function run(req: Request): Promise<NextResponse> {
  const denied = requireCron(req);
  if (denied) return denied;

  const { data: locs, error } = await db
    .from("locations")
    .select("id")
    .eq("connection_status", "connected");
  if (error) {
    console.error("[cron/fetch-reviews] location query failed:", error.message);
    return NextResponse.json(
      { ok: false, error: "Location query failed" },
      { status: 500 }
    );
  }

  let fetched = 0;
  let created = 0;
  let updated = 0;
  let markedDeleted = 0;
  let failed = 0;
  for (const loc of locs ?? []) {
    try {
      const r = await fetchReviewsHandler(loc.id);
      if (r.ok) {
        fetched += r.fetched;
        created += r.created;
        updated += r.updated;
        markedDeleted += r.markedDeleted;
      } else {
        failed += 1;
      }
    } catch (e) {
      console.error("[cron/fetch-reviews] unexpected error:", e);
      failed += 1;
    }
  }
  return NextResponse.json(
    {
      ok: failed === 0,
      checked: (locs ?? []).length,
      fetched,
      created,
      updated,
      markedDeleted,
      failed,
    },
    { status: failed === 0 ? 200 : 500 }
  );
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
