"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function DangerZone() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirm }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not delete the account.");
        setBusy(false);
        return;
      }
      router.push("/login");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "TimeoutError"
          ? "The request timed out. Please try again."
          : "Network error. Check your connection and try again."
      );
      setBusy(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:border-red-900 dark:bg-zinc-950 dark:text-zinc-100";

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Export your data
          </p>
          <p className="text-xs text-zinc-500">
            Download profile, locations, reviews, posts and billing history as
            JSON. Secrets are never included.
          </p>
        </div>
        <a
          href="/api/account/export"
          download
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Download JSON
        </a>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm font-semibold text-red-700 dark:text-red-300">
          Danger zone
        </p>
        <p className="mt-1 text-xs text-red-600/90 dark:text-red-400/90">
          Deleting your account permanently removes every location, review,
          post, QR code, payment record and preference. This cannot be undone.
        </p>

        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-600 hover:text-white dark:border-red-800 dark:bg-zinc-950 dark:text-red-300 dark:hover:bg-red-600 dark:hover:text-white"
          >
            Delete account…
          </button>
        ) : (
          <form onSubmit={submit} className="mt-4 max-w-sm space-y-3">
            <div>
              <label
                htmlFor="delete-password"
                className="text-sm text-red-800 dark:text-red-200"
              >
                Confirm your password
              </label>
              <input
                id="delete-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="delete-confirm"
                className="text-sm text-red-800 dark:text-red-200"
              >
                Type <span className="font-semibold">DELETE</span> to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="DELETE"
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={busy || confirm !== "DELETE"}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Permanently delete account"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setPassword("");
                  setConfirm("");
                  setError(null);
                }}
                className="text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Cancel
              </button>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
