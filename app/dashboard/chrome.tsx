"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LocationSwitcher, type SwitcherLocation } from "./location-switcher";
import { NotificationsBell } from "./notifications-bell";

interface NavLink {
  label: string;
  href: string;
  active: boolean;
  icon: ReactNode;
}

function NavSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS: Record<string, ReactNode> = {
  Dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  Reviews: (
    <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9z" />
  ),
  Posts: (
    <path d="M5 4h14a1 1 0 0 1 1 1v14l-4-3H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
  ),
  "QR code": (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM19 19h2v2h-2z" />
    </>
  ),
  Billing: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  Profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </>
  ),
  Settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.1 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a1.9 1.9 0 1 1-3.8 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.3a1.9 1.9 0 1 1 0-3.8h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 2.7-1.1v-.3a1.9 1.9 0 1 1 3.8 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a1.9 1.9 0 1 1 0 3.8h-.2a1.6 1.6 0 0 0-1.5 1z" />
    </>
  ),
  Help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3A2.5 2.5 0 1 1 12 12v1.5" />
      <path d="M12 17h.01" />
    </>
  ),
};

function navClass(active: boolean): string {
  return active
    ? "flex items-center gap-2.5 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/20"
    : "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100";
}

function Section({
  title,
  links,
  onNavigate,
}: {
  title: string;
  links: NavLink[];
  onNavigate?: () => void;
}) {
  return (
    <div>
      <p className="px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
        {title}
      </p>
      <ul className="mt-2 space-y-1">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              prefetch={l.href.startsWith("/dashboard#") ? false : undefined}
              onClick={onNavigate}
              aria-current={l.active ? "page" : undefined}
              className={navClass(l.active)}
            >
              <NavSvg>{l.icon}</NavSvg>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className="flex items-center gap-2.5 px-4 py-4"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl brand-gradient text-sm font-bold text-white shadow-md shadow-indigo-500/25 [font-family:var(--font-display)]">
        G
      </span>
      <span>
        <span className="block font-display text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          GBP Suite
        </span>
        <span className="block text-[10.5px] text-zinc-500">
          Google Business + QR reviews
        </span>
      </span>
    </Link>
  );
}

function initialsOf(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : "";
  return (first + second).toUpperCase();
}

function PanelBody({
  workspace,
  account,
  name,
  email,
  switcher,
  onNavigate,
  onSignOut,
}: {
  workspace: NavLink[];
  account: NavLink[];
  name: string;
  email: string;
  switcher?: ReactNode;
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {switcher}
        <Section title="Workspace" links={workspace} onNavigate={onNavigate} />
        <Section title="Account" links={account} onNavigate={onNavigate} />
      </nav>
      <div className="space-y-1 border-t border-zinc-200/80 p-3 dark:border-zinc-800/80">
        <Link
          href="/dashboard/profile"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-zinc-50 dark:hover:bg-zinc-900"
          title={email}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full brand-gradient text-[11px] font-bold text-white">
            {initialsOf(name, email)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {name.trim() || email}
            </span>
            <span className="block truncate text-[11px] text-zinc-500">
              {email}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
        >
          <NavSvg>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
          </NavSvg>
          Sign out
        </button>
      </div>
    </>
  );
}

/**
 * Dashboard chrome: fixed sidebar (desktop) / drawer (mobile) + sticky
 * top bar with the notifications bell. The page content is rendered as
 * `children` inside <main>. Reviews/Posts/QR nav always opens a real
 * location page: URL location > persisted dash_loc > first location.
 */
export function DashboardChrome({
  locations,
  selectedId,
  email,
  name,
  children,
}: {
  locations: SwitcherLocation[];
  selectedId: string | null;
  email: string;
  name: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Location context of the page being viewed (deep links land here too).
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const locMatch = /^\/dashboard\/locations\/([^/]+)(\/.*)?$/.exec(pathname);
  const pathLoc =
    locMatch && UUID_RE.test(locMatch[1]) ? (locMatch[1] as string) : null;
  const pathSuffix = locMatch ? (locMatch[2] ?? "") : null;

  // Nav targets: the location whose page is open, then the persisted
  // selection; with no selection, multi-location owners get the section's
  // all-locations view (Reviews/Posts/QR index) so the links match the
  // switcher's "All locations", and single-location owners get their
  // location — links never dead-end on /dashboard.
  const multiLoc = locations.length > 1;
  const aggregate = (suffix: string): string =>
    suffix === ""
      ? "/dashboard/reviews"
      : suffix === "/posts"
        ? "/dashboard/posts"
        : "/dashboard/qr";
  const target = (suffix: string): string => {
    const loc = pathLoc ?? selectedId;
    if (loc) return `/dashboard/locations/${loc}${suffix}`;
    if (multiLoc) return aggregate(suffix);
    const first = locations[0]?.id ?? null;
    return first ? `/dashboard/locations/${first}${suffix}` : "/dashboard";
  };
  const onLocPage = pathLoc !== null;

  const workspace: NavLink[] = [
    { label: "Dashboard", href: "/dashboard", active: pathname === "/dashboard", icon: ICONS.Dashboard },
    {
      label: "Reviews",
      href: target(""),
      active: pathname === "/dashboard/reviews" || (onLocPage && pathSuffix === ""),
      icon: ICONS.Reviews,
    },
    {
      label: "Posts",
      href: target("/posts"),
      active: pathname === "/dashboard/posts" || (onLocPage && pathSuffix === "/posts"),
      icon: ICONS.Posts,
    },
    {
      label: "QR code",
      href: target("/qr"),
      active: pathname === "/dashboard/qr" || (onLocPage && pathSuffix === "/qr"),
      icon: ICONS["QR code"],
    },
  ];
  const account: NavLink[] = [
    { label: "Billing", href: "/dashboard/billing", active: pathname === "/dashboard/billing", icon: ICONS.Billing },
    {
      label: "Profile",
      href: "/dashboard/profile",
      active: pathname === "/dashboard/profile",
      icon: ICONS.Profile,
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      active: pathname === "/dashboard/settings",
      icon: ICONS.Settings,
    },
    {
      label: "Help",
      href: "/dashboard/help",
      active: pathname === "/dashboard/help",
      icon: ICONS.Help,
    },
  ];

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  async function signOut(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const close = () => setDrawerOpen(false);
  const switcher = (
    <LocationSwitcher
      locations={locations}
      value={pathLoc ?? selectedId ?? "all"}
      pathname={pathname}
    />
  );

  return (
    <div className="min-h-dvh">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950 lg:flex">
        <Brand />
        <PanelBody
          workspace={workspace}
          account={account}
          name={name}
          email={email}
          switcher={switcher}
          onSignOut={signOut}
        />
      </aside>

      {/* mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-black/40"
            onClick={close}
            aria-hidden="true"
          />
          <aside className="animate-slide-in absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950">
            <Brand onNavigate={close} />
            <PanelBody
              workspace={workspace}
              account={account}
              name={name}
              email={email}
              switcher={switcher}
              onNavigate={close}
              onSignOut={signOut}
            />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-zinc-200/70 bg-white/80 px-4 py-2.5 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/80 sm:gap-3">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 lg:hidden"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <NotificationsBell />
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
