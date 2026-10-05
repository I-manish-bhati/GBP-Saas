/**
 * In-content loader for dashboard navigations (the sidebar/header chrome stays
 * mounted, so this renders inside the content area). Branded pulse + shimmer
 * skeleton cards — pure CSS.
 */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-6 py-10 animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-logo-pulse flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient text-xl font-bold text-white [font-family:var(--font-display)]">
          G
        </div>
        <div className="loader-track h-1.5 w-40 rounded-full" />
      </div>

      <div className="stagger grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        <div className="skeleton h-28 rounded-2xl" />
        <div className="skeleton h-28 rounded-2xl" />
        <div className="skeleton h-28 rounded-2xl" />
        <div className="skeleton h-28 rounded-2xl" />
      </div>
    </div>
  );
}
