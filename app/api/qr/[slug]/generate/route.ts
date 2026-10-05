import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/customer";
import { requireActiveSubscription } from "@/lib/billing/subscription";
import { rateLimit } from "@/lib/rate-limit";
import { aiDailyCapExceeded } from "@/lib/gemini/cap";
import { generateReviewDraft } from "@/lib/gemini/review-draft";

export const runtime = "nodejs";

const OWNER_AI_DAILY = 100; // D4 shared quota
const CUSTOMER_AI_DAILY = 30; // extra per-IP guard

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).default([]),
});

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * M9 "Generate review": customer auth + FR-35 billing gate (owner's slot) +
 * D4 rate limits (owner/day + customer IP/day) + ai_generation_logs via the
 * Gemini helper (type='review_draft').
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const customer = await requireCustomer();
  if (customer instanceof NextResponse) return customer;

  const { slug } = await ctx.params;
  const { data: locRows } = await db
    .from("locations")
    .select("id, owner_id, connection_status")
    .eq("slug", slug)
    .limit(1);
  const loc = locRows && locRows.length > 0 ? locRows[0] : null;
  if (!loc || loc.connection_status !== "connected") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // FR-35: AI draft requires the business owner's active subscription.
  const gate = await requireActiveSubscription(loc.owner_id, loc.id);
  if (!gate.ok) {
    return NextResponse.json(
      {
        error: "AI drafts are unavailable for this business right now. You can still write your own review.",
        code: gate.code,
      },
      { status: 403 }
    );
  }

  const [ownerLimit, ipLimit] = await Promise.all([
    rateLimit({
      bucket: "ai:owner:day",
      key: loc.owner_id,
      limit: OWNER_AI_DAILY,
      windowMs: 24 * 60 * 60_000,
    }),
    rateLimit({
      bucket: "ai:customer:day",
      key: clientIp(req),
      limit: CUSTOMER_AI_DAILY,
      windowMs: 24 * 60 * 60_000,
    }),
  ]);
  if (!ownerLimit.success || !ipLimit.success) {
    return NextResponse.json(
      { error: "Today's AI limit has been reached. You can still write your own review.", code: "AI_LIMIT" },
      { status: 429 }
    );
  }

  // DB-backed cap (second layer — holds even without Upstash).
  if (await aiDailyCapExceeded(loc.owner_id)) {
    return NextResponse.json(
      { error: "Today's AI limit has been reached. You can still write your own review.", code: "AI_LIMIT" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please choose a rating from 1 to 5." }, { status: 400 });
  }

  const result = await generateReviewDraft({
    locationId: loc.id,
    rating: parsed.data.rating,
    tags: parsed.data.tags,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, draft: result.draft });
}
