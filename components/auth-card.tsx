import type { ReactNode } from "react";
import Link from "next/link";

export const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 placeholder-zinc-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-400";

export const buttonClass =
  "w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-base font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 active:from-indigo-600 active:to-violet-600 disabled:cursor-not-allowed disabled:opacity-50";

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
    >
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
    >
      {message}
    </p>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div
        aria-hidden
        className="animate-float pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-400/20 blur-[90px]"
      />
      <div
        aria-hidden
        className="animate-float pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-fuchsia-400/15 blur-[90px] [animation-delay:-3s]"
      />
      <div className="w-full max-w-sm animate-fade-up">
        <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-7 shadow-2xl shadow-indigo-500/10 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/70">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl brand-gradient text-base font-bold text-white shadow-md shadow-indigo-500/25 [font-family:var(--font-display)]">
              G
            </span>
            <span className="font-display text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              GBP Suite
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? (
          <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {footer}
          </div>
        ) : null}
        <p className="mt-6 text-center text-xs text-zinc-400">
          <Link href="/privacy" className="underline hover:text-zinc-600">
            Privacy Policy
          </Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="underline hover:text-zinc-600">
            Terms of Service
          </Link>
        </p>
      </div>
    </main>
  );
}
