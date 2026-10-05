import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { aiDailyUsage } from "@/lib/gemini/cap";
import { VerifyEmailNotice } from "../verify-email-notice";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

function initialsOf(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : "";
  return (first + second).toUpperCase();
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-800/80 dark:bg-zinc-900">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
        {children}
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) redirect("/login?next=/dashboard/profile");

  const [{ data: ownerRows }, { data: locRows }, { data: subRows }, usage] =
    await Promise.all([
      db
        .from("owners")
        .select("email, name, email_verified, created_at")
        .eq("id", claims.sub)
        .limit(1),
      db
        .from("locations")
        .select("id, connection_status")
        .eq("owner_id", claims.sub)
        .order("created_at", { ascending: true }),
      db
        .from("subscriptions")
        .select("status, quantity")
        .eq("owner_id", claims.sub)
        .limit(1),
      aiDailyUsage(claims.sub),
    ]);

  const owner = ownerRows?.[0];
  if (!owner) redirect("/login?next=/dashboard/profile");

  const locations = locRows ?? [];
  const locationCount = locations.length;
  const connectedCount = locations.filter(
    (l) => l.connection_status === "connected"
  ).length;
  const sub = subRows?.[0];

  const locIds = locations.map((l) => l.id);
  let reviewCount = 0;
  if (locIds.length > 0) {
    const { count } = await db
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .in("location_id", locIds);
    reviewCount = count ?? 0;
  }

  const joined = new Date(owner.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Profile
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Your account details and plan status.
      </p>

      {!owner.email_verified ? (
        <div className="mt-6">
          <VerifyEmailNotice email={owner.email} />
        </div>
      ) : null}

      {/* Identity banner */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-900">
        <div className="brand-gradient h-16 w-full opacity-90" />
        <div className="flex flex-wrap items-end gap-4 px-6 pb-5">
          <span className="-mt-9 flex h-[68px] w-[68px] items-center justify-center rounded-2xl brand-gradient text-2xl font-bold text-white shadow-xl shadow-indigo-500/30 ring-4 ring-white [font-family:var(--font-display)] dark:ring-zinc-900">
            {initialsOf(owner.name ?? "", owner.email)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {owner.name?.trim() || owner.email}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <span className="truncate">{owner.email}</span>
              {owner.email_verified ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                  Verified
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Unverified
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stagger mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Locations" value={String(locationCount)} />
        <Stat label="Reviews" value={String(reviewCount)} />
        <Stat label="AI drafts (24h)" value={`${usage.used}/${usage.limit}`} />
        <Stat label="Connected" value={`${connectedCount}/${locationCount}`} />
      </div>

      {/* Details */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800/80 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Account details
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Your name appears in the sidebar and on receipts.
          </p>
          <div className="mt-4">
            <ProfileForm initialName={owner.name ?? ""} />
          </div>
        </section>

        <div className="space-y-3">
          <Detail label="Member since">{joined}</Detail>
          <Detail label="Plan">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {sub?.status === "active"
                  ? `Active — ${sub.quantity ?? 1} AI slot${(sub.quantity ?? 1) === 1 ? "" : "s"}`
                  : sub?.status
                    ? `Status: ${sub.status}`
                    : "Free — connecting Google is free"}
              </span>
              <Link
                href="/dashboard/billing"
                className="font-medium text-indigo-600 underline underline-offset-2 dark:text-indigo-300"
              >
                Billing →
              </Link>
            </span>
          </Detail>
          <Detail label="Password">
            <Link
              href="/dashboard/settings"
              className="font-medium underline underline-offset-2"
            >
              Change in Settings →
            </Link>
          </Detail>
        </div>
      </div>
    </div>
  );
}
