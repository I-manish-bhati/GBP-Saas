"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client-api";
import type { ImageRow } from "./image-gallery";

export function PostGenerateForm({
  locationId,
  images,
  canUseAi,
  upgradeHint,
}: {
  locationId: string;
  images: ImageRow[];
  canUseAi: boolean;
  upgradeHint: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function generate() {
    setError(null);
    if (selected.length === 0) {
      setError("Select at least one image.");
      return;
    }
    setBusy(true);
    try {
      const res = await postJson(`/api/locations/${locationId}/posts/generate`, {
        imageIds: selected,
      });
      if (res.ok) {
        setSelected([]);
        router.refresh();
      } else {
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  if (images.length === 0) {
    return (
      <p className="mt-2 text-sm text-zinc-500">
        Upload at least one image first.
      </p>
    );
  }

  return (
    <div className="mt-2">
      <ul className="flex flex-wrap gap-2">
        {images.map((img) => {
          const on = selected.includes(img.id);
          return (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => toggle(img.id)}
                aria-pressed={on}
                className={`relative rounded-lg border-2 transition ${
                  on
                    ? "border-zinc-900 dark:border-zinc-100"
                    : "border-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.image_url}
                  alt={img.caption ?? "Image"}
                  className={`h-16 w-16 rounded-lg object-cover ${on ? "" : "opacity-70"}`}
                  loading="lazy"
                />
                {on ? (
                  <span className="absolute right-1 top-1 rounded-full bg-zinc-900 px-1.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void generate()}
          disabled={!canUseAi || busy}
          title={canUseAi ? undefined : upgradeHint}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {busy ? "Generating…" : "✨ Generate post"}
        </button>
        <span className="text-xs text-zinc-500">
          {selected.length} selected · auto-publishes 2h after generation unless
          you edit or reject
        </span>
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
  );
}
