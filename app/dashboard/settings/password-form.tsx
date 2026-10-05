"use client";

import { useState, type FormEvent } from "react";
import { postJson } from "@/lib/client-api";

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (next !== confirm) {
      setStatus({ kind: "err", text: "New passwords don't match." });
      return;
    }
    setBusy(true);
    setStatus(null);
    const res = await postJson("/api/auth/change-password", {
      currentPassword: current,
      newPassword: next,
    });
    setBusy(false);
    if (res.ok) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setStatus({ kind: "ok", text: "Password updated." });
    } else {
      setStatus({
        kind: "err",
        text: res.error ?? "Could not update the password.",
      });
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

  return (
    <form onSubmit={submit} className="mt-3 max-w-sm space-y-3">
      <div>
        <label
          htmlFor="current-password"
          className="text-sm text-zinc-700 dark:text-zinc-300"
        >
          Current password
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="new-password"
          className="text-sm text-zinc-700 dark:text-zinc-300"
        >
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="confirm-password"
          className="text-sm text-zinc-700 dark:text-zinc-300"
        >
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {busy ? "Updating…" : "Update password"}
      </button>
      {status ? (
        <p
          role="status"
          className={
            status.kind === "ok"
              ? "text-sm text-green-700 dark:text-green-400"
              : "text-sm text-red-600 dark:text-red-400"
          }
        >
          {status.text}
        </p>
      ) : null}
    </form>
  );
}
