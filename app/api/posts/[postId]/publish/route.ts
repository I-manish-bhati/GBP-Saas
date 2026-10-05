import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/billing/subscription";
import { publishPostHandler } from "@/lib/google/posts";
import { guardPost } from "../../_lib";

export const runtime = "nodejs";

const publishSchema = z.object({
  text: z.string().trim().max(1500).optional(),
});

/** Approve now → publish immediately (FR-18/FR-19). */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ postId: string }> }
) {
  const { postId } = await ctx.params;
  const guard = await guardPost(postId);
  if (guard instanceof NextResponse) return guard;

  // FR-35 billing gate: publishing requires an active subscription.
  const gate = await requireActiveSubscription(guard.ownerId, guard.locationId);
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error, code: gate.code },
      { status: 403 }
    );
  }

  const { data: rows } = await db
    .from("posts")
    .select("id, status, ai_generated_text, final_text")
    .eq("id", guard.postId)
    .limit(1);
  const post = rows?.[0];
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.status === "published") {
    return NextResponse.json(
      { error: "Already published.", code: "ALREADY_PUBLISHED" },
      { status: 409 }
    );
  }

  const raw = (await req.json().catch(() => ({}))) as unknown;
  const parsed = publishSchema.safeParse(raw);
  const text =
    parsed.success && parsed.data.text
      ? parsed.data.text
      : (post.final_text ?? post.ai_generated_text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Write or generate a post first." }, { status: 400 });
  }

  const { error: updErr } = await db
    .from("posts")
    .update({ final_text: text, auto_publish_at: null })
    .eq("id", guard.postId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const result = await publishPostHandler(guard.postId);
  if (!result.ok) {
    return NextResponse.json(
      { error: `Publish failed: ${result.error ?? "unknown error"}` },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, googlePostId: result.googlePostId ?? null });
}
