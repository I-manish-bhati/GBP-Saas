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
 * current section (the URL's location segment is swapped, so
 * Reviews/Posts/QR stay open on the new location); choosing "All locations"
 * from a location page returns to the dashboard.
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
  const nextFor = (v: string): string =>
    match === null
      ? pathname
      : v === "all"
        ? "/dashboard"
        : `/dashboard/locations/${v}${match[2] ?? ""}`;

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
