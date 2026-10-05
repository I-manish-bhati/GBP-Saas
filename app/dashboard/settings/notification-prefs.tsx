"use client";

import { useState } from "react";
import { patchJson } from "@/lib/client-api";

interface Prefs {
  email: boolean;
  inApp: Record<string, boolean>;
}

const TYPE_ROWS: { key: string; label: string; hint: string }[] = [
  {
    key: "post_ready",
    label: "Post ready for review",
    hint: "Your AI-drafted Google post is waiting for approval.",
  },
  {
    key: "post_failed",
    label: "Post failed to publish",
    hint: "Google rejected or a post couldn't be sent.",
  },
  {
    key: "token_expired",
    label: "Google connection expired",
    hint: "A location needs to be reconnected.",
  },
  {
    key: "payment_failed",
    label: "Payment failed",
    hint: "A charge on your subscription didn't go through.",
  },
];

function Switch({
  on,
  onToggle,
  label,
  disabled,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
        on ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

/**
 * Prefs arrive server-rendered (settings page fetches them) so there is no
 * loading race; every toggle saves optimistically and rolls back on failure.
 */
export function NotificationPrefs({ initialPrefs }: { initialPrefs: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save(next: Prefs): Promise<void> {
    const previous = prefs;
    setPrefs(next);
    setSaving(true);
    setStatus(null);
    const res = await patchJson("/api/profile/notifications", next);
    setSaving(false);
    if (res.ok) {
      setStatus("Saved.");
    } else {
      setPrefs(previous);
      setStatus(res.error ?? "Could not save preferences.");
    }
  }

  return (
    <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
      <div className="flex items-start justify-between gap-4 pb-3">
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Email notifications
          </p>
          <p className="text-xs text-zinc-500">
            Send an email copy of the enabled notifications below.
          </p>
        </div>
        <Switch
          on={prefs.email}
          label="Email notifications"
          disabled={saving}
          onToggle={() => void save({ ...prefs, email: !prefs.email })}
        />
      </div>
      {TYPE_ROWS.map((row) => {
        const on = prefs.inApp[row.key] !== false;
        return (
          <div
            key={row.key}
            className="flex items-start justify-between gap-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {row.label}
              </p>
              <p className="text-xs text-zinc-500">{row.hint}</p>
            </div>
            <Switch
              on={on}
              label={row.label}
              disabled={saving}
              onToggle={() =>
                void save({
                  ...prefs,
                  inApp: { ...prefs.inApp, [row.key]: !on },
                })
              }
            />
          </div>
        );
      })}
      {status ? (
        <p role="status" className="pt-3 text-sm text-green-700 dark:text-green-400">
          {status}
        </p>
      ) : null}
    </div>
  );
}
