"use client";

import { useEffect } from "react";

/**
 * Route-segment error boundary. Shows a generic message only — the thrown
 * error is logged, never rendered (no stack traces leak to users).
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error?.message, error?.digest ?? "");
  }, [error]);

  return (
    <main className="mx-auto w-full flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
        500
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        An unexpected error occurred. Please try again — if it keeps
        happening, contact support.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 min-h-12 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        Try again
      </button>
    </main>
  );
}
