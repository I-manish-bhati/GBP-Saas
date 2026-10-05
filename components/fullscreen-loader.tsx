/**
 * Full-screen branded loader for route navigations (auth, legal). Pure CSS —
 * no client JS. Kept OUT of app/loading.tsx on purpose: a root-level loading
 * boundary streams a 200 shell before dynamic pages can call notFound(),
 * which broke the public /r 404 status (m9). Segment-scoped loaders don't
 * wrap /r.
 */
export function FullscreenLoader() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-6 bg-background px-6 animate-fade-in bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.09),transparent_62%)]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-logo-pulse flex h-14 w-14 items-center justify-center rounded-2xl brand-gradient text-2xl font-bold text-white [font-family:var(--font-display)]">
          G
        </div>
        <div className="text-center">
          <p className="font-display text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            GBP Suite
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Loading…
          </p>
        </div>
        <div className="loader-track h-1.5 w-44 rounded-full" />
      </div>
    </div>
  );
}
