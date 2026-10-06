"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { postJson } from "@/lib/client-api";

interface Notif {
  id: string;
  type: string;
  reference_id: string | null;
  location_id: string | null;
  created_at: string;
  read_at: string | null;
}

const LABELS: Record<string, string> = {
  post_ready: "Post ready for approval",
  token_expired: "Google connection needs reconnecting",
  payment_failed: "Payment failed",
  post_failed: "Post failed to publish",
};

const ICONS: Record<string, string> = {
  post_ready: "📝",
  token_expired: "🔌",
  payment_failed: "💳",
  post_failed: "⚠️",
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function hrefFor(n: Notif): string {
  if (n.type === "payment_failed") return "/dashboard/billing";
  if (n.type === "token_expired") {
    return n.location_id ? `/dashboard?loc=${n.location_id}` : "/dashboard";
  }
  // post_ready / post_failed → that post's approval list, highlighted.
  if (n.location_id && n.reference_id) {
    return `/dashboard/locations/${n.location_id}/posts?post=${n.reference_id}`;
  }
  return "/dashboard";
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const load = (): void => {
      fetch("/api/notifications")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
        .then((data: { notifications: Notif[]; unread: number }) => {
          if (!alive) return;
          setItems(data.notifications);
          setUnread(data.unread);
          setError(null);
        })
        .catch(() => {
          // Transient failures happen (dev HMR cancels in-flight requests);
          // retry with backoff so the badge is not stuck at zero.
          if (!alive) return;
          attempt += 1;
          if (attempt <= 3) timer = setTimeout(load, 750 * attempt);
          else setError("Could not load notifications.");
        });
    };
    load();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent): void {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markOne(n: Notif): Promise<void> {
    if (n.read_at) return;
    setUnread((u) => Math.max(0, u - 1));
    setItems((prev) =>
      prev
        ? prev.map((x) =>
            x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x
          )
        : prev
    );
    await postJson(`/api/notifications/${n.id}/read`, {});
  }

  async function markAll(): Promise<void> {
    const res = await postJson("/api/notifications/read-all", {});
    if (res.ok) {
      setUnread(0);
      setItems((prev) =>
        prev
          ? prev.map((x) => ({
              ...x,
              read_at: x.read_at ?? new Date().toISOString(),
            }))
          : prev
      );
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Notifications
            </span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAll}
                className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">{error}</p>
          ) : items === null ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-400">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-400">
              No notifications yet.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((n) => {
                const unreadItem = n.read_at === null;
                return (
                  <li key={n.id}>
                    <Link
                      href={hrefFor(n)}
                      onClick={() => {
                        void markOne(n);
                        setOpen(false);
                      }}
                      className={`flex min-h-14 items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                        unreadItem
                          ? "bg-blue-50/60 dark:bg-blue-950/30"
                          : ""
                      }`}
                    >
                      <span className="mt-0.5 text-base" aria-hidden="true">
                        {ICONS[n.type] ?? "🔔"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-zinc-800 dark:text-zinc-200">
                          {LABELS[n.type] ?? n.type}
                        </span>
                        <span className="mt-0.5 block text-xs text-zinc-400">
                          {relTime(n.created_at)}
                        </span>
                      </span>
                      {unreadItem ? (
                        <span
                          aria-label="unread"
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600"
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
