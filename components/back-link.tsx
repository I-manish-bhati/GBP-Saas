"use client";

import { useRouter } from "next/navigation";

/** In-page "← Back" for public pages: returns to the previous page of the
 *  current session (settings/dashboard when opened logged-in — the old link
 *  hardcoded /login). history.length <= 2 means a fresh tab/direct open
 *  (about:blank + this page), so fall back to the landing page instead. */
export function BackLink({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 2) router.back();
        else router.push(fallback);
      }}
      className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
    >
      ← Back
    </button>
  );
}
