import "server-only";
import { db } from "@/lib/db";
import { gbpFetch } from "./client";

export interface FetchReviewsResult {
  ok: boolean;
  fetched: number;
  created: number;
  updated: number;
  markedDeleted: number;
  error?: string;
}

interface RawReview {
  name?: string;
  reviewId?: string;
  starRating?: string;
  comment?: string;
  reviewer?: { displayName?: string };
}

const STAR_TO_INT: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

const READ_MASK = "name,reviewId,starRating,comment,reviewer,createTime,updateTime";
const PAGE_SIZE = 50;

/**
 * FR-11..13: page through GBP reviews for one location and upsert by the
 * unique `google_review_id` (NFR-4 no-dupes). Edit policy: changed
 * text/rating updates the row (status/draft/reply preserved). Delete policy:
 * reviews that disappeared from Google get `deleted_at` set — never
 * hard-deleted. `sync_logs` op `fetch_reviews` comes from gbpFetch per attempt.
 *
 * Runner-agnostic (D1): never throws.
 */
export async function fetchReviewsHandler(locationId: string): Promise<FetchReviewsResult> {
  let fetched = 0;
  let created = 0;
  let updated = 0;
  let markedDeleted = 0;

  try {
    const { data: locRows } = await db
      .from("locations")
      .select("id, google_location_id")
      .eq("id", locationId)
      .limit(1);
    const loc = locRows?.[0];
    if (!loc) return { ok: false, fetched, created, updated, markedDeleted, error: "Location not found" };
    if (!/^accounts\/[^/]+\/locations\/[^/]+$/.test(loc.google_location_id)) {
      return {
        ok: false,
        fetched,
        created,
        updated,
        markedDeleted,
        error: "Location has no valid Google resource name",
      };
    }

    const all: RawReview[] = [];
    let pageToken: string | undefined;
    do {
      const res = await gbpFetch<{ reviews?: RawReview[]; nextPageToken?: string }>(
        locationId,
        `/v1/${loc.google_location_id}/reviews`,
        {
          op: "fetch_reviews",
          query: {
            pageSize: String(PAGE_SIZE),
            readMask: READ_MASK,
            pageToken,
          },
        }
      );
      if (!res.ok) {
        return {
          ok: false,
          fetched: all.length,
          created,
          updated,
          markedDeleted,
          error: res.error,
        };
      }
      all.push(...(res.data.reviews ?? []));
      pageToken = res.data.nextPageToken;
    } while (pageToken);
    fetched = all.length;

    const { data: existing } = await db
      .from("reviews")
      .select("id, google_review_id, rating, review_text, deleted_at")
      .eq("location_id", locationId);

    const existingByGoogleId = new Map(
      (existing ?? []).map((r) => [r.google_review_id, r])
    );

    const payload = all
      .filter((r) => r.reviewId)
      .map((r) => ({
        location_id: locationId,
        google_review_id: r.reviewId!,
        reviewer_name: r.reviewer?.displayName ?? null,
        rating: STAR_TO_INT[r.starRating ?? ""] ?? 5,
        review_text: r.comment ?? null,
        fetched_at: new Date().toISOString(),
        deleted_at: null as string | null,
      }));

    if (payload.length > 0) {
      const { error: upErr } = await db
        .from("reviews")
        .upsert(payload, { onConflict: "google_review_id" });
      if (upErr) {
        return {
          ok: false,
          fetched,
          created,
          updated,
          markedDeleted,
          error: `upsert: ${upErr.message}`,
        };
      }
    }

    for (const row of payload) {
      const prior = existingByGoogleId.get(row.google_review_id);
      if (!prior) {
        created += 1;
      } else if (
        prior.rating !== row.rating ||
        (prior.review_text ?? null) !== row.review_text ||
        prior.deleted_at
      ) {
        updated += 1;
      }
    }

    const presentIds = new Set(payload.map((p) => p.google_review_id));
    const missingIds = (existing ?? [])
      .filter((r) => !r.deleted_at && !presentIds.has(r.google_review_id))
      .map((r) => r.id);
    if (missingIds.length > 0) {
      const { error: delErr } = await db
        .from("reviews")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", missingIds);
      if (!delErr) markedDeleted = missingIds.length;
    }

    return { ok: true, fetched, created, updated, markedDeleted };
  } catch (e) {
    return {
      ok: false,
      fetched,
      created,
      updated,
      markedDeleted,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
