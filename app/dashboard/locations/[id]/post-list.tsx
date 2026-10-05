"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { patchJson, postJson } from "@/lib/client-api";

export interface PostRow {
  id: string;
  status: "draft" | "awaiting_approval" | "scheduled" | "published" | "failed";
  ai_generated_text: string | null;
  final_text: string | null;
  auto_publish_at: string | null;
  published_at: string | null;
  google_post_id: string | null;
  created_at: string;
  /** aggregate (all-locations) view only: row provenance + pill link */
  locationId?: string;
  locationName?: string;
  locationCity?: string | null;
}

const BADGE: Record<PostRow["status"], string> = {
  draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  awaiting_approval:
    "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  scheduled:
    "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  published: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

function AutoCountdown({ at }: { at: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const init = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearTimeout(init);
      clearInterval(t);
    };
  }, []);
  const target = new Date(at).toLocaleString();
  if (now === null) return <span>Auto-publishes {target}</span>;
  const diff = Date.parse(at) - now;
  if (!Number.isFinite(diff)) return null;
  if (diff <= 0) return <span className="text-blue-600">auto-publishing shortly…</span>;
  const mins = Math.round(diff / 60_000);
  const when = mins >= 90 ? `in ~${Math.round((mins / 60) * 10) / 10}h` : `in ~${mins}m`;
  return (
    <span>
      Auto-publishes {target} ({when}) — editing or rejecting cancels this.
    </span>
  );
}

function PostCard({
  post,
  canUseAi,
  upgradeHint,
  highlight,
}: {
  post: PostRow;
  canUseAi: boolean;
  upgradeHint: string;
  highlight: boolean;
}) {
  const router = useRouter();
  const current = (post.final_text ?? post.ai_generated_text ?? "") as string;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(current);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editable =
    post.status === "awaiting_approval" ||
    post.status === "draft" ||
    post.status === "failed";

  async function act(kind: "save" | "publish" | "reject") {
    setError(null);
    setBusy(kind);
    try {
      if (kind === "save") {
        const res = await patchJson(`/api/posts/${post.id}`, { text });
        if (res.ok) {
          setEditing(false);
          router.refresh();
        } else setError(res.error);
      } else if (kind === "publish") {
        const res = await postJson(`/api/posts/${post.id}/publish`, { text });
        if (res.ok) router.refresh();
        else setError(res.error);
      } else {
        const res = await postJson(`/api/posts/${post.id}/reject`, {});
        if (res.ok) router.refresh();
        else setError(res.error);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <li
      id={`post-${post.id}`}
      className={`px-4 py-4 ${
        highlight
          ? "bg-amber-50 ring-2 ring-inset ring-amber-400 dark:bg-amber-950/40"
          : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[post.status]}`}
          >
            {post.status}
          </span>
          <span className="text-xs text-zinc-500">
            {post.created_at.slice(0, 10)}
          </span>
          {post.locationName && post.locationId ? (
            <Link
              href={`/dashboard/locations/${post.locationId}/posts`}
              title={`Open ${post.locationName}`}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              {post.locationName}
              {post.locationCity ? ` · ${post.locationCity}` : ""}
            </Link>
          ) : null}
        </div>
        {post.status === "published" && post.published_at ? (
          <span className="text-xs text-zinc-500">
            published {post.published_at.slice(0, 16).replace("T", " ")}
            {post.google_post_id ? (
              <span className="ml-1 font-mono text-[10px] text-zinc-400">
                {post.google_post_id}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      {post.status === "awaiting_approval" && post.auto_publish_at ? (
        <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
          <AutoCountdown at={post.auto_publish_at} />
        </p>
      ) : null}
      {post.status === "failed" ? (
        <p className="mt-2 text-xs text-red-600">
          Publish failed. Fix and retry — error is recorded in sync logs.
        </p>
      ) : null}

      {editing ? (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void act("save")}
              disabled={busy !== null}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {busy === "save" ? "Saving…" : "Save (cancels auto-publish)"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {text || "(empty)"}
        </p>
      )}

      {post.ai_generated_text && post.final_text ? (
        <p className="mt-1 text-[11px] italic text-zinc-400">
          Edited from AI draft: “{post.ai_generated_text.slice(0, 120)}…”
        </p>
      ) : null}

      {editable && !editing ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={busy !== null}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => void act("publish")}
            disabled={!canUseAi || busy !== null}
            title={canUseAi ? undefined : upgradeHint}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "publish"
              ? "Publishing…"
              : post.status === "failed"
                ? "Retry publish"
                : "Approve now"}
          </button>
          {post.status === "awaiting_approval" ? (
            <button
              type="button"
              onClick={() => void act("reject")}
              disabled={busy !== null}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-800 disabled:opacity-50 dark:hover:text-zinc-200"
            >
              {busy === "reject" ? "Rejecting…" : "Reject"}
            </button>
          ) : null}
        </div>
      ) : null}
      {!canUseAi && editable ? (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{upgradeHint}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function PostList({
  posts,
  canUseAi,
  upgradeHint,
  highlightId,
  gates,
  emptyText,
}: {
  posts: PostRow[];
  canUseAi: boolean;
  upgradeHint: string;
  highlightId?: string | null;
  /** aggregate view: per-location AI-slot gates (keyed by locationId) */
  gates?: Record<string, { ok: boolean; error: string }>;
  emptyText?: string;
}) {
  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => {
      document
        .getElementById(`post-${highlightId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(t);
  }, [highlightId]);

  if (posts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
        {emptyText ?? "No posts yet. Select images and generate one."}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {posts.map((p) => {
        const g = gates && p.locationId ? gates[p.locationId] : undefined;
        return (
          <PostCard
            key={p.id}
            post={p}
            canUseAi={g ? g.ok : canUseAi}
            upgradeHint={g ? g.error : upgradeHint}
            highlight={p.id === highlightId}
          />
        );
      })}
    </ul>
  );
}
