import { NextResponse } from "next/server";
import { requireCron } from "@/lib/auth/cron";
import { autoPublishHandler } from "@/lib/google/posts";

export const runtime = "nodejs";

/**
 * D1 job — FR-18 auto-publish timer, every 5 min (vercel.json).
 * `autoPublishHandler` selects due posts (`awaiting_approval` with
 * `auto_publish_at <= now`) and isolates per-post failures (NFR-6); failures
 * land in `sync_logs` + a `post_failed` notification, and the stateless next
 * run retries whatever is still due.
 */
async function run(req: Request): Promise<NextResponse> {
  const denied = requireCron(req);
  if (denied) return denied;

  const summary = await autoPublishHandler();
  return NextResponse.json(summary, {
    status: summary.ok ? 200 : 500,
  });
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
