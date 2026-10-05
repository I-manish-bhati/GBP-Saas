import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { aiDailyCapExceeded } from "@/lib/gemini/cap";
import { requireActiveSubscription } from "@/lib/billing/subscription";
import { generateReviewReply } from "@/lib/gemini/review-reply";
import { guardReview } from "../../_lib";

export const runtime = "nodejs";

const AI_DAILY_LIMIT = 100; // D4 free-tier quota guard

export async function POST(
  req: Request,
  ctx: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await ctx.params;
  const guard = await guardReview(reviewId);
  if (guard instanceof NextResponse) return guard;

  // FR-35 billing gate (D3): AI generate requires an active subscription.
  const gate = await requireActiveSubscription(guard.ownerId, guard.locationId);
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error, code: gate.code },
      { status: 403 }
    );
  }

  // D4 cost guard: per-owner/day.
  const limit = await rateLimit({
    bucket: "ai:owner:day",
    key: guard.ownerId,
    limit: AI_DAILY_LIMIT,
    windowMs: 24 * 60 * 60_000,
  });
  if (!limit.success) {
    return NextResponse.json(
      {
        error:
          "You've reached today's AI limit. Write the reply yourself or try again tomorrow.",
        code: "AI_LIMIT",
      },
      { status: 429 }
    );
  }

  // DB-backed cap (second layer — holds even without Upstash).
  if (await aiDailyCapExceeded(guard.ownerId)) {
    return NextResponse.json(
      {
        error:
          "You've reached today's AI limit. Write the reply yourself or try again tomorrow.",
        code: "AI_LIMIT",
      },
      { status: 429 }
    );
  }

  const result = await generateReviewReply({
    locationId: guard.locationId,
    reviewId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, draft: result.draft });
}
