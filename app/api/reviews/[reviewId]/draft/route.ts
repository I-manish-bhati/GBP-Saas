import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardReview } from "../../_lib";

export const runtime = "nodejs";

const schema = z.object({
  draft: z.string().max(4000),
});

/** Owner edits the AI draft inline — saved as-is (re-generate re-logs a new call). */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await ctx.params;
  const guard = await guardReview(reviewId);
  if (guard instanceof NextResponse) return guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const draft = parsed.data.draft;
  const { data: revRows } = await db
    .from("reviews")
    .select("status")
    .eq("id", reviewId)
    .limit(1);
  if (!revRows || revRows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await db
    .from("reviews")
    .update({
      ai_reply_draft: draft,
      status:
        revRows[0].status === "pending" && draft ? "drafted" : revRows[0].status,
    })
    .eq("id", reviewId);
  if (error) {
    console.error("[reviews] draft save failed:", error.message);
    return NextResponse.json({ error: "Could not save draft." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
