import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardPost } from "../../_lib";

export const runtime = "nodejs";

/**
 * Reject → cancels the auto-publish timer (FR-18): `auto_publish_at = null`,
 * `status='draft'` (schema has no 'rejected'; draft = owner kept it back).
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ postId: string }> }
) {
  const { postId } = await ctx.params;
  const guard = await guardPost(postId);
  if (guard instanceof NextResponse) return guard;

  const { data: rows } = await db
    .from("posts")
    .select("id, status")
    .eq("id", guard.postId)
    .limit(1);
  const post = rows?.[0];
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.status === "published") {
    return NextResponse.json(
      { error: "Post is already published.", code: "ALREADY_PUBLISHED" },
      { status: 409 }
    );
  }
  if (post.status !== "awaiting_approval") {
    return NextResponse.json({ error: "Nothing to reject." }, { status: 409 });
  }

  const { error } = await db
    .from("posts")
    .update({ auto_publish_at: null, status: "draft" })
    .eq("id", guard.postId);
  if (error) {
    console.error("[posts] reject failed:", error.message);
    return NextResponse.json({ error: "Could not save post." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "draft" });
}
