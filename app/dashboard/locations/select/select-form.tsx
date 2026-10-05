"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client-api";
import { buttonClass } from "@/components/auth-card";

export interface SelectableLocation {
  resourceName: string;
  name: string;
  accountName: string;
  placeId: string | null;
}

export function SelectLocationsForm({
  state,
  locations,
}: {
  state: string;
  locations: SelectableLocation[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const selected = fd.getAll("loc").map(String);
    if (selected.length === 0) {
      setError("Select at least one location.");
      return;
    }
    setPending(true);
    const res = await postJson("/api/locations", { state, selected });
    if (res.ok) {
      const skipped = (res.data as { skipped?: number } | null)?.skipped ?? 0;
      router.push(`/dashboard?gbp=added${skipped ? `&n=${skipped}` : ""}`);
      return;
    }
    setError(res.error);
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-2">
        {locations.map((l) => (
          <label
            key={l.resourceName}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
          >
            <input
              type="checkbox"
              name="loc"
              value={l.resourceName}
              defaultChecked
              className="mt-1 h-4 w-4 rounded border-zinc-300 accent-zinc-900"
            />
            <span>
              <span className="block font-medium text-zinc-900 dark:text-zinc-100">
                {l.name}
              </span>
              <span className="block text-xs text-zinc-500">
                {l.accountName}
                {l.placeId ? ` · place ${l.placeId}` : ""}
              </span>
            </span>
          </label>
        ))}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        <button type="submit" disabled={pending} className={`${buttonClass} !w-auto px-5`}>
          {pending ? "Adding…" : "Add selected"}
        </button>
        <a
          href="/dashboard"
          className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
