import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/billing/subscription";
import { gbpFetch } from "@/lib/google/client";
import { guardReview } from "../../_lib";

export const runtime = "nodejs";

const schema = z.object({
  text: z.string().trim().min(1, "Reply cannot be empty.").max(4000),
});

/**
 * FR-15: approve → publish reply via GBP API. On failure the review stays
 * `pending`/`drafted`, error lands in `sync_logs` (gbpFetch, op
 * `publish_reply`) for admin drill-down (FR-40).
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await ctx.params;
  const guard = await guardReview(reviewId);
  if (guard instanceof NextResponse) return guard;

  // FR-35 billing gate: publishing requires an active subscription.
  const gate = await requireActiveSubscription(guard.ownerId, guard.locationId);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error, code: gate.code }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Reply text is required." }, { status: 400 });
  }
  const text = parsed.data.text;

  const { data: revRows } = await db
    .from("reviews")
    .select("id, status, google_review_id, location_id")
    .eq("id", reviewId)
    .limit(1);
  const review = revRows?.[0];
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: locRows } = await db
    .from("locations")
    .select("google_location_id")
    .eq("id", review.location_id)
    .limit(1);
  const glid = locRows?.[0]?.google_location_id;
  if (!glid || !/^accounts\/[^/]+\/locations\/[^/]+$/.test(glid)) {
    return NextResponse.json(
      { error: "Location is not connected to Google." },
      { status: 409 }
    );
  }

  const res = await gbpFetch<unknown>(
    review.location_id,
    `/v1/${glid}/reviews/${review.google_review_id}/reply`,
    {
      op: "publish_reply",
      init: {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: text }),
      },
    }
  );

  if (!res.ok) {
    // Status untouched → stays pending/drafted (FR-40).
    return NextResponse.json(
      { error: `Publish failed: ${res.error}` },
      { status: 502 }
    );
  }

  const now = new Date().toISOString();
  const { error: updErr } = await db
    .from("reviews")
    .update({
      status: "replied",
      final_reply: text,
      ai_reply_draft: text,
      replied_at: now,
    })
    .eq("id", reviewId);
  if (updErr) {
    return NextResponse.json(
      { error: `Published, but saving state failed: ${updErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
