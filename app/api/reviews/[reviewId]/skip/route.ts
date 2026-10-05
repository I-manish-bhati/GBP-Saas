import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardReview } from "../../_lib";

export const runtime = "nodejs";

/** Owner decides not to reply → `status='skipped'`. */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await ctx.params;
  const guard = await guardReview(reviewId);
  if (guard instanceof NextResponse) return guard;

  const { data: revRows } = await db
    .from("reviews")
    .select("status")
    .eq("id", reviewId)
    .limit(1);
  if (!revRows || revRows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (revRows[0].status === "replied") {
    return NextResponse.json(
      { error: "Already replied." },
      { status: 409 }
    );
  }

  const { error } = await db
    .from("reviews")
    .update({ status: "skipped" })
    .eq("id", reviewId);
  if (error) {
    console.error("[reviews] skip failed:", error.message);
    return NextResponse.json({ error: "Could not save review." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
