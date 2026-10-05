import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { aiDailyCapExceeded } from "@/lib/gemini/cap";
import { requireActiveSubscription } from "@/lib/billing/subscription";
import { generatePostText } from "@/lib/gemini/post-text";
import { guardLocation } from "../../../_lib";

export const runtime = "nodejs";

const AI_DAILY_LIMIT = 100; // D4 free-tier quota guard (shared w/ reviews)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const generateSchema = z.object({
  imageIds: z.array(z.string()).max(20).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ locationId: string }> }
) {
  const { locationId } = await ctx.params;
  const guard = await guardLocation(locationId);
  if (guard instanceof NextResponse) return guard;

  // FR-35 billing gate: AI generate requires an active subscription.
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
          "You've reached today's AI limit. Write the post yourself or try again tomorrow.",
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
          "You've reached today's AI limit. Write the post yourself or try again tomorrow.",
        code: "AI_LIMIT",
      },
      { status: 429 }
    );
  }

  const raw = (await req.json().catch(() => ({}))) as unknown;
  const parsed = generateSchema.safeParse(raw);
  const imageIds = (parsed.success ? parsed.data.imageIds : [])
    ?.filter((v): v is string => typeof v === "string" && UUID_RE.test(v)) ?? [];
  if (imageIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one image." },
      { status: 400 }
    );
  }

  const result = await generatePostText({
    locationId: guard.locationId,
    imageIds,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, postId: result.postId, text: result.text });
}
