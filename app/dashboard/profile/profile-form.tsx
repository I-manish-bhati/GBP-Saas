"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { patchJson } from "@/lib/client-api";

export function ProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const res = await patchJson("/api/profile", { name });
    setBusy(false);
    if (res.ok) {
      setStatus({ kind: "ok", text: "Profile updated." });
      router.refresh();
    } else {
      setStatus({
        kind: "err",
        text: res.error ?? "Could not save the profile.",
      });
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label
          htmlFor="display-name"
          className="text-sm text-zinc-700 dark:text-zinc-300"
        >
          Full name
        </label>
        <input
          id="display-name"
          type="text"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className={inputClass}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save changes"}
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
      </div>
    </form>
  );
}
