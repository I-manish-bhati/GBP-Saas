"use client";

import { useSyncExternalStore, useState } from "react";

/**
 * NFR-8: Google OAuth breaks inside some in-app webviews — detect the usual
 * suspects via UA and offer "open in browser" + copy-link fallback.
 */
const IN_APP_RE =
  /instagram|fbav|fban|facebook|line\/|microblog|wv|webview|twitter|linkedin|pinterest/i;

function subscribe(): () => void {
  return () => {};
}

export function InAppBanner() {
  const ua = useSyncExternalStore(
    subscribe,
    () => navigator.userAgent,
    () => ""
  );
  const [copied, setCopied] = useState(false);

  const inApp = ua !== "" && IN_APP_RE.test(ua);
  if (!inApp) return null;

  async function copyLink(): Promise<void> {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch {
        setCopied(false);
      }
      document.body.removeChild(ta);
    }
  }

  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
    >
      <p className="font-medium">
        For the best experience, open this page in Chrome or Safari.
      </p>
      <button
        type="button"
        onClick={copyLink}
        className="mt-2 rounded-lg bg-amber-900 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700 dark:bg-amber-100 dark:text-amber-900"
      >
        {copied ? "Link copied ✓" : "Copy link"}
      </button>
    </div>
  );
}
