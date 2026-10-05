import "server-only";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { gbpFetch } from "./client";

export interface PublishPostResult {
  ok: boolean;
  googlePostId?: string;
  error?: string;
}

const LANGUAGE_CODES: Record<string, string> = {
  english: "en",
  hindi: "hi",
  hinglish: "en",
};

/**
 * FR-19: publish one post to GBP posts API, store `google_post_id`,
 * `status='published'`, `published_at` (sync_logs op `publish_post` comes
 * from gbpFetch). Failure → `status='failed'` + `notify(post_failed)` (D8,
 * FR-40 via sync_logs). Media is attached best-effort: if Google rejects it
 * we retry once without media so the text still publishes.
 *
 * Runner-agnostic (D1): never throws.
 */
export async function publishPostHandler(postId: string): Promise<PublishPostResult> {
  let ownerId: string | null = null;
  try {
    const { data: rows } = await db
      .from("posts")
      .select(
        "id, location_id, status, ai_generated_text, final_text, source_image_id, locations ( id, owner_id, google_location_id, language )"
      )
      .eq("id", postId)
      .limit(1);
    const post = rows?.[0] as
      | {
          id: string;
          status: string;
          ai_generated_text: string | null;
          final_text: string | null;
          source_image_id: string | null;
          locations: {
            id: string;
            owner_id: string;
            google_location_id: string;
            language: string | null;
          } | null;
        }
      | undefined;
    const loc = post?.locations;
    if (!post || !loc) return { ok: false, error: "Post not found" };
    ownerId = loc.owner_id;

    const text = (post.final_text ?? post.ai_generated_text ?? "").trim();
    if (!text) return { ok: false, error: "Post has no text" };

    if (!/^accounts\/[^/]+\/locations\/[^/]+$/.test(loc.google_location_id)) {
      const failMsg = "Location has no valid Google resource name";
      try {
        await db.from("sync_logs").insert({
          location_id: loc.id,
          operation: "publish_post",
          status: "failed",
          error_message: failMsg,
        });
      } catch {
        /* audit best-effort */
      }
      await markFailed(post.id, loc.owner_id);
      return { ok: false, error: failMsg };
    }

    let imageUrl: string | null = null;
    if (post.source_image_id) {
      const { data: imgRows } = await db
        .from("location_images")
        .select("image_url")
        .eq("id", post.source_image_id)
        .limit(1);
      imageUrl = imgRows?.[0]?.image_url ?? null;
    }

    const base: Record<string, unknown> = {
      languageCode: LANGUAGE_CODES[loc.language ?? "english"] ?? "en",
      summary: text,
    };
    const media = imageUrl
      ? [{ mediaFormat: "PHOTO", mediaUrl: imageUrl }]
      : undefined;

    let res = await gbpFetch<{ name?: string }>(
      loc.id,
      `/v1/${loc.google_location_id}/posts`,
      {
        op: "publish_post",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(media ? { ...base, media } : base),
        },
      }
    );

    if (!res.ok && media && res.status === 400) {
      // Media can be rejected for size/processing — retry text-only.
      res = await gbpFetch<{ name?: string }>(
        loc.id,
        `/v1/${loc.google_location_id}/posts`,
        {
          op: "publish_post",
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(base),
          },
        }
      );
    }

    if (!res.ok) {
      await markFailed(post.id, loc.owner_id);
      return { ok: false, error: res.error };
    }

    const googlePostId =
      typeof res.data?.name === "string" && res.data.name ? res.data.name : null;
    const { error: updErr } = await db
      .from("posts")
      .update({
        google_post_id: googlePostId,
        status: "published",
        published_at: new Date().toISOString(),
        auto_publish_at: null,
      })
      .eq("id", post.id);
    if (updErr) {
      return { ok: false, error: `Could not save publish state: ${updErr.message}` };
    }

    return { ok: true, googlePostId: googlePostId ?? undefined };
  } catch (e) {
    console.error("[google] publish post failed:", e);
    if (ownerId) {
      await markFailed(postId, ownerId);
    }
    return { ok: false, error: e instanceof Error ? e.message : "publish failed" };
  }
}

async function markFailed(postId: string, ownerId: string): Promise<void> {
  try {
    await db.from("posts").update({ status: "failed" }).eq("id", postId);
  } catch (e) {
    console.error("[google] mark failed error:", e);
  }
  await notify(ownerId, "post_failed", postId);
}

export interface AutoPublishSummary {
  ok: boolean;
  due: number;
  published: number;
  failed: number;
}

/**
 * FR-18 auto-approve timer: publish every post whose
 * `status='awaiting_approval' AND auto_publish_at <= now()`.
 * Per-post try/catch (NFR-6): one bad location never blocks the rest.
 * Runner-agnostic (D1) — mounted at `/api/cron/publish-posts` (5-min cron); never throws.
 */
export async function autoPublishHandler(): Promise<AutoPublishSummary> {
  const summary: AutoPublishSummary = { ok: true, due: 0, published: 0, failed: 0 };
  try {
    const { data: due } = await db
      .from("posts")
      .select("id")
      .eq("status", "awaiting_approval")
      .lte("auto_publish_at", new Date().toISOString())
      .order("auto_publish_at", { ascending: true })
      .limit(100);
    summary.due = (due ?? []).length;
    for (const row of due ?? []) {
      try {
        const result = await publishPostHandler(row.id);
        if (result.ok) summary.published += 1;
        else summary.failed += 1;
      } catch (e) {
        console.error("[google] autoPublish per-post error:", e);
        summary.failed += 1;
      }
    }
    return summary;
  } catch (e) {
    console.error("[google] autoPublish failed:", e);
    summary.ok = false;
    return summary;
  }
}
