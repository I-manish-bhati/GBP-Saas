"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchJson } from "@/lib/client-api";

const TEMPLATES = [
  { id: "minimal", label: "Minimal", hint: "Clean white with an accent bar" },
  { id: "classic", label: "Classic", hint: "Brand header band on top" },
  { id: "badge", label: "Badge", hint: "Rounded frame with a star" },
  { id: "pop", label: "Pop", hint: "Full brand background, white card" },
] as const;

interface Settings {
  qr_template: string;
  brand_color: string;
  tagline: string;
}

export function QrSettingsForm({
  locationId,
  initial,
}: {
  locationId: string;
  initial: Settings;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(next: Partial<Settings>): Promise<void> {
    const merged = { ...settings, ...next };
    setSettings(merged);
    setBusy(true);
    setMessage(null);
    const res = await patchJson(`/api/locations/${locationId}`, {
      qr_template: merged.qr_template,
      brand_color: merged.brand_color,
      tagline: merged.tagline.trim() === "" ? null : merged.tagline.trim(),
    });
    setBusy(false);
    if (res.ok) {
      setMessage("Saved.");
      router.refresh();
    } else {
      setMessage(res.error ?? "Could not save.");
    }
  }

  return (
    <div className="mt-2 space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <fieldset>
        <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Template
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={busy}
              onClick={() => save({ qr_template: t.id })}
              aria-pressed={settings.qr_template === t.id}
              className={
                settings.qr_template === t.id
                  ? "rounded-lg border-2 border-zinc-900 bg-zinc-100 px-3 py-2 text-left text-sm disabled:opacity-50 dark:border-zinc-100 dark:bg-zinc-800"
                  : "rounded-lg border-2 border-zinc-200 px-3 py-2 text-left text-sm hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-500"
              }
            >
              <span className="block font-medium text-zinc-900 dark:text-zinc-100">
                {t.label}
              </span>
              <span className="block text-xs text-zinc-500">{t.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="brand_color"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Brand color
        </label>
        <div className="mt-1 flex items-center gap-3">
          <input
            id="brand_color"
            type="color"
            value={settings.brand_color}
            onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
            onBlur={() => save({ brand_color: settings.brand_color })}
            disabled={busy}
            className="h-10 w-14 cursor-pointer rounded border border-zinc-300 bg-white disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
            {settings.brand_color}
          </span>
          <span className="text-xs text-zinc-500">QR itself stays black on white.</span>
        </div>
      </div>

      <div>
        <label
          htmlFor="tagline"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Tagline (optional)
        </label>
        <input
          id="tagline"
          type="text"
          maxLength={120}
          value={settings.tagline}
          onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
          onBlur={() => save({ tagline: settings.tagline })}
          disabled={busy}
          placeholder="e.g. Scan to share your visit"
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>

      {message ? (
        <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
          {message}
        </p>
      ) : null}
    </div>
  );
}
