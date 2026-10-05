import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCron } from "@/lib/auth/cron";
import { refreshTokenHandler } from "@/lib/google/refresh";

export const runtime = "nodejs";

/**
 * D1 job — token lifecycle (FR-9/FR-10), hourly (vercel.json).
 * For every connected location, refresh the Google token when it is expired
 * or within the 5-minute margin. Isolation (NFR-6): per-location try/catch —
 * one broken location never blocks the rest; failures land in `sync_logs`
 * and the stateless next run retries cleanly (partial failures return 500 so
 * retry-capable schedulers, e.g. QStash, back off and re-invoke).
 */
async function run(req: Request): Promise<NextResponse> {
  const denied = requireCron(req);
  if (denied) return denied;

  const { data: locs, error } = await db
    .from("locations")
    .select("id")
    .eq("connection_status", "connected");
  if (error) {
    console.error("[cron/refresh-tokens] location query failed:", error.message);
    return NextResponse.json(
      { ok: false, error: "Location query failed" },
      { status: 500 }
    );
  }

  let refreshed = 0;
  let failed = 0;
  for (const loc of locs ?? []) {
    try {
      if (await refreshTokenHandler(loc.id)) refreshed += 1;
      else failed += 1;
    } catch (e) {
      console.error("[cron/refresh-tokens] unexpected error:", e);
      failed += 1;
    }
  }
  return NextResponse.json(
    {
      ok: failed === 0,
      checked: (locs ?? []).length,
      refreshed,
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
