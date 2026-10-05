"use client";

export interface SwitcherLocation {
  id: string;
  name: string;
}

/**
 * FR-20: persisted location switcher, rendered inside the sidebar (desktop
 * aside + mobile drawer). Hidden entirely when the owner has a single
 * location (no clutter). A plain GET form navigates to
 * /api/dashboard/selection, which persists the dash_loc cookie and keeps the
 * current section: choosing a location swaps the URL's location segment
 * (Reviews/Posts/QR stay open on the new location), and choosing
 * "All locations" from a location page opens that section's all-locations
 * view (/dashboard/reviews, /dashboard/posts or /dashboard/qr) instead of
 * dumping the user back on the dashboard table.
 */
export function LocationSwitcher({
  locations,
  value,
  pathname,
}: {
  locations: SwitcherLocation[];
  /** selected location id, or "all" when no selection is persisted */
  value: string;
  pathname: string;
}) {
  if (locations.length <= 1) return null;

  const match = /^\/dashboard\/locations\/([^/]+)(\/.*)?$/.exec(pathname);
  // all-locations section pages carry the same suffix a location page would
  const aggSuffix =
    pathname === "/dashboard/reviews"
      ? ""
      : pathname === "/dashboard/posts"
        ? "/posts"
        : pathname === "/dashboard/qr"
          ? "/qr"
          : null;
  const aggregateFor = (suffix: string): string =>
    suffix === ""
      ? "/dashboard/reviews"
      : suffix === "/posts"
        ? "/dashboard/posts"
        : suffix === "/qr"
          ? "/dashboard/qr"
          : "/dashboard";
  const nextFor = (v: string): string => {
    if (v === "all") {
      // location page → that section's all-locations view; anywhere else
      // (aggregate pages, dashboard, profile…) stays put
      return match !== null ? aggregateFor(match[2] ?? "") : pathname;
    }
    if (match !== null) return `/dashboard/locations/${v}${match[2] ?? ""}`;
    if (aggSuffix !== null) return `/dashboard/locations/${v}${aggSuffix}`;
    return pathname;
  };

  return (
    <form
      action="/api/dashboard/selection"
      method="get"
      className="block border-b border-zinc-200/80 px-3 pb-3 dark:border-zinc-800/80"
    >
      <input type="hidden" name="next" value={nextFor(value)} />
      <label className="block">
        <span className="px-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
          Location
        </span>
        <select
          name="loc"
          aria-label="Select location"
          value={value}
          onChange={(e) => {
            const form = e.currentTarget.form;
            const hidden = form?.elements.namedItem("next");
            if (hidden instanceof HTMLInputElement) {
              // recompute for the CHOSEN location before submitting
              hidden.value = nextFor(e.target.value);
            }
            form?.submit();
          }}
          className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="all">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
