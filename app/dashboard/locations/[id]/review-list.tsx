"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { patchJson, postJson } from "@/lib/client-api";

export interface ReviewRow {
  id: string;
  rating: number;
  reviewer_name: string | null;
  review_text: string | null;
  status: "pending" | "drafted" | "replied" | "skipped";
  ai_reply_draft: string | null;
  final_reply: string | null;
  replied_at: string | null;
  fetched_at: string;
  /** aggregate (all-locations) view only: row provenance + pill link */
  locationId?: string;
  locationName?: string;
  locationCity?: string | null;
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-500" aria-label={`${n} out of 5`}>
      {"★".repeat(n)}
      <span className="text-zinc-300 dark:text-zinc-600">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function Badge({ status }: { status: ReviewRow["status"] }) {
  const styles: Record<ReviewRow["status"], string> = {
    pending: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    drafted: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    replied: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    skipped: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function ReviewItem({
  review,
  canUseAi,
  upgradeHint,
}: {
  review: ReviewRow;
  canUseAi: boolean;
  upgradeHint: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(review.ai_reply_draft ?? "");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editable = review.status === "pending" || review.status === "drafted";

  async function act(kind: "generate" | "approve" | "skip" | "save") {
    setError(null);
    setBusy(kind);
    try {
      if (kind === "save") {
        if (dirty) {
          const res = await patchJson(`/api/reviews/${review.id}/draft`, { draft });
          if (!res.ok) setError(res.error);
          setDirty(false);
        }
      } else if (kind === "generate") {
        const res = await postJson(`/api/reviews/${review.id}/generate`, {});
        if (res.ok) {
          const d = (res.data as { draft?: string } | null)?.draft ?? "";
          setDraft(d);
          setDirty(false);
          router.refresh();
        } else {
          setError(res.error);
        }
      } else if (kind === "approve") {
        const text = draft.trim();
        if (!text) {
          setError("Write or generate a reply first.");
          return;
        }
        const res = await postJson(`/api/reviews/${review.id}/reply`, { text });
        if (res.ok) {
          router.refresh();
        } else {
          setError(res.error);
        }
      } else if (kind === "skip") {
        const res = await postJson(`/api/reviews/${review.id}/skip`, {});
        if (res.ok) router.refresh();
        else setError(res.error);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Stars n={review.rating} />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {review.reviewer_name ?? "Anonymous"}
          </span>
          <Badge status={review.status} />
          {review.locationName && review.locationId ? (
            <Link
              href={`/dashboard/locations/${review.locationId}`}
              title={`Open ${review.locationName}`}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              {review.locationName}
              {review.locationCity ? ` · ${review.locationCity}` : ""}
            </Link>
          ) : null}
        </div>
        <span className="text-xs text-zinc-500">
          {review.fetched_at.slice(0, 10)}
        </span>
      </div>

      {review.review_text ? (
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          {review.review_text}
        </p>
      ) : (
        <p className="mt-2 text-sm italic text-zinc-400">No text (star rating only)</p>
      )}

      {review.status === "replied" ? (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900 dark:bg-green-950 dark:text-green-200">
          Replied: {review.final_reply}
        </p>
      ) : null}

      {review.status === "skipped" ? (
        <p className="mt-3 text-sm text-zinc-400">Skipped — no reply sent.</p>
      ) : null}

      {editable ? (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
            Reply draft
          </label>
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setDirty(true);
            }}
            onBlur={() => {
              if (dirty && review.status !== "pending") void act("save");
            }}
            rows={3}
            placeholder="Write a reply, or generate a draft…"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => act("generate")}
              disabled={!canUseAi || busy !== null}
              title={canUseAi ? undefined : upgradeHint}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {busy === "generate" ? "Generating…" : "✨ AI draft"}
            </button>
            <button
              type="button"
              onClick={() => act("save")}
              disabled={busy !== null}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {busy === "save" ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={() => act("approve")}
              disabled={!canUseAi || busy !== null}
              title={canUseAi ? undefined : upgradeHint}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "approve" ? "Publishing…" : "Approve & publish"}
            </button>
            <button
              type="button"
              onClick={() => act("skip")}
              disabled={busy !== null}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-800 disabled:opacity-50 dark:hover:text-zinc-200"
            >
              Skip
            </button>
          </div>
          {!canUseAi ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{upgradeHint}</p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function ReviewList({
  reviews,
  canUseAi,
  upgradeHint,
  gates,
  emptyText,
}: {
  reviews: ReviewRow[];
  canUseAi: boolean;
  upgradeHint: string;
  /** aggregate view: per-location AI-slot gates (keyed by locationId) */
  gates?: Record<string, { ok: boolean; error: string }>;
  emptyText?: string;
}) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
        {emptyText ?? "No reviews here yet. Hit “Sync reviews” to pull them from Google."}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {reviews.map((r) => {
        const g = gates && r.locationId ? gates[r.locationId] : undefined;
        return (
          <ReviewItem
            key={r.id}
            review={r}
            canUseAi={g ? g.ok : canUseAi}
            upgradeHint={g ? g.error : upgradeHint}
          />
        );
      })}
    </ul>
  );
}
