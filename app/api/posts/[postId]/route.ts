import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardPost } from "../_lib";

export const runtime = "nodejs";

const patchSchema = z.object({
  text: z.string().trim().min(1, { message: "Post text is required." }).max(1500),
});

/**
 * Edit → cancels the auto-publish timer (FR-18: owner action overrides the
 * timer): saves the edited text, `auto_publish_at = null`, `status='draft'`.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ postId: string }> }
) {
  const { postId } = await ctx.params;
  const guard = await guardPost(postId);
  if (guard instanceof NextResponse) return guard;

  const { data: rows } = await db
    .from("posts")
    .select("id, status, ai_generated_text, final_text")
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

  const raw = (await req.json().catch(() => ({}))) as unknown;
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Post text is required." },
      { status: 400 }
    );
  }

  const { error } = await db
    .from("posts")
    .update({
      final_text: parsed.data.text,
      auto_publish_at: null,
      status: "draft",
    })
    .eq("id", guard.postId);
  if (error) {
    console.error("[posts] patch failed:", error.message);
    return NextResponse.json({ error: "Could not save post." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "draft" });
}
