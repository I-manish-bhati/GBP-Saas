"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client-api";

export function SyncButton({ locationId }: { locationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setPending(true);
    setError(null);
    const res = await postJson(`/api/locations/${locationId}/reviews/fetch`, {});
    setPending(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={sync}
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Syncing…" : "Sync reviews"}
      </button>
      {error ? (
        <span role="alert" className="max-w-xs text-right text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </span>
  );
}
