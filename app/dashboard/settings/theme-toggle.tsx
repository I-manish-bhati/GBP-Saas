"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

const THEME_EVENT = "gbp-theme-change";

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem("gbp-theme");
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme): void {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    window.localStorage.setItem("gbp-theme", theme);
  } catch {
    /* storage may be unavailable — class still applies for this load */
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

function subscribe(onStoreChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onStoreChange();
  window.addEventListener(THEME_EVENT, handler);
  window.addEventListener("storage", handler);
  mq.addEventListener("change", handler);
  return () => {
    window.removeEventListener(THEME_EVENT, handler);
    window.removeEventListener("storage", handler);
    mq.removeEventListener("change", handler);
  };
}

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ThemeToggle() {
  // External store: the inline script in the root layout applies the class
  // pre-paint; this stays in sync with localStorage + OS changes without
  // hydration mismatch (server snapshot is always "system").
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system");

  return (
    <div
      role="group"
      aria-label="Theme"
      className="mt-3 inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-950"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={theme === o.value}
          onClick={() => applyTheme(o.value)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            theme === o.value
              ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-700"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
