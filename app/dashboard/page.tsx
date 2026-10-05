import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { CopyQrButton } from "./copy-qr";
import { VerifyEmailNotice } from "./verify-email-notice";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "drafted", "replied", "skipped"] as const;

const NOTICES: Record<string, string> = {
  added: "Locations added — your dashboard is ready.",
  reconnected: "Google Business Profile reconnected.",
  "state missing": "That Google connection step expired. Please start again.",
  "state invalid or expired": "That Google connection step expired. Please start again.",
  "token exchange failed": "Google did not accept the connection. Please try again.",
  "could not fetch GBP locations": "Connected, but reading your locations failed. Try again.",
};

function Notice({ kind, text }: { kind: "ok" | "err"; text: string }) {
  return (
    <p
      role="status"
      className={
        kind === "ok"
          ? "mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
          : "mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-200 dark:bg-red-950 dark:text-red-300"
      }
    >
      {text}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

interface LocRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  connection_status: string;
}

interface LocStats {
  reviews: number;
  ratingSum: number;
  byStatus: Record<string, number>;
  pendingPosts: number;
  failedPosts: number;
}

function emptyStats(): LocStats {
  return { reviews: 0, ratingSum: 0, byStatus: {}, pendingPosts: 0, failedPosts: 0 };
}

function fmtAvg(sum: number, count: number): string {
  if (count === 0) return "—";
  return (Math.round((sum / count) * 10) / 10).toFixed(1);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) redirect("/login?next=/dashboard");

  const sp = await searchParams;
  const gbp = typeof sp.gbp === "string" ? sp.gbp : null;
  const gbpError = typeof sp.gbp_error === "string" ? sp.gbp_error : null;

  const { data: ownerRows } = await db
    .from("owners")
    .select("email, email_verified")
    .eq("id", claims.sub)
    .limit(1);
  const ownerEmail = ownerRows?.[0]?.email ?? "";
  const emailVerified = ownerRows?.[0]?.email_verified ?? true;

  const { data: locationRows } = await db
    .from("locations")
    .select("id, name, slug, city, connection_status, created_at")
    .eq("owner_id", claims.sub)
    .order("created_at", { ascending: true });
  const locations = (locationRows ?? []) as LocRow[];

  // FR-20: the per-location card view follows only the shareable ?loc deep
  // link (notifications). The persisted dash_loc cookie steers sidebar nav
  // targets (Reviews/Posts/QR) — it must NOT swap the dashboard overview
  // table away just because a location was picked in the sidebar dropdown.
  const rawLoc = typeof sp.loc === "string" ? sp.loc : null;
  const owned = new Set(locations.map((l) => l.id));
  const selectedId = rawLoc && owned.has(rawLoc) ? rawLoc : null;
  const selected = selectedId
    ? locations.find((l) => l.id === selectedId) ?? null
    : null;

  // Per-location + aggregate stats — DB only, no GBP calls (NFR-6 isolation).
  const stats = new Map<string, LocStats>();
  let totalReviews = 0;
  let ratingSum = 0;
  let awaitingReply = 0;
  let pendingApprovals = 0;

  if (locations.length > 0) {
    for (const l of locations) stats.set(l.id, emptyStats());

    const [{ data: reviewRows }, { data: postRows }] = await Promise.all([
      db
        .from("reviews")
        .select(
          "location_id, rating, status, deleted_at, locations!inner(owner_id)"
        )
        .eq("locations.owner_id", claims.sub)
        .is("deleted_at", null),
      db
        .from("posts")
        .select("location_id, status, locations!inner(owner_id)")
        .eq("locations.owner_id", claims.sub),
    ]);

    for (const r of reviewRows ?? []) {
      const s = stats.get(r.location_id);
      if (!s) continue;
      s.reviews += 1;
      s.ratingSum += r.rating;
      s.byStatus[r.status] = (s.byStatus[r.status] ?? 0) + 1;
      totalReviews += 1;
      ratingSum += r.rating;
      if (r.status === "pending") awaitingReply += 1;
    }
    for (const p of postRows ?? []) {
      const s = stats.get(p.location_id);
      if (!s) continue;
      if (p.status === "awaiting_approval") {
        s.pendingPosts += 1;
        pendingApprovals += 1;
      } else if (p.status === "failed") {
        s.failedPosts += 1;
      }
    }
  }

  const hasBroken = locations.some((l) => l.connection_status !== "connected");

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
      </div>

      {gbp === "added" || gbp === "reconnected" ? (
        <Notice kind="ok" text={NOTICES[gbp]} />
      ) : gbpError ? (
        <Notice kind="err" text={NOTICES[gbpError] ?? gbpError} />
      ) : null}

      {!emailVerified ? <VerifyEmailNotice email={ownerEmail} /> : null}

      {locations.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-zinc-300 px-4 py-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            No locations yet. Connect your Google Business Profile to import
            them — each one gets its own QR review link.
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Connecting is free. AI replies and post generation need a paid slot.
          </p>
          <Link
            href="/api/auth/gbp/start"
            prefetch={false}
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Connect Google Business Profile
          </Link>
        </div>
      ) : selected ? (
        /* ---------------- per-location view (FR-20) ---------------- */
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {selected.name}
              </h2>
              <p className="text-sm text-zinc-500">
                {selected.city ?? "—"} ·{" "}
                {selected.connection_status === "connected" ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                    Connected
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Needs reconnect
                  </span>
                )}
              </p>
            </div>
            <Link
              href={`/dashboard/locations/${selected.id}`}
              className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
            >
              Manage reviews →
            </Link>
          </div>

          {selected.connection_status !== "connected" ? (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              This location lost its Google connection.{" "}
              <Link
                href={`/api/auth/gbp/start?location_id=${selected.id}`}
                prefetch={false}
                className="font-medium underline"
              >
                Reconnect Google Business Profile
              </Link>
            </div>
          ) : null}

          {(() => {
            const s = stats.get(selected.id) ?? emptyStats();
            return (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Reviews" value={String(s.reviews)} />
                  <Stat label="Avg rating" value={fmtAvg(s.ratingSum, s.reviews)} />
                  <Stat label="Awaiting reply" value={String(s.byStatus.pending ?? 0)} />
                  <Stat label="Pending posts" value={String(s.pendingPosts)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUSES.map((st) => (
                    <span
                      key={st}
                      className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {st}: {s.byStatus[st] ?? 0}
                    </span>
                  ))}
                  {s.failedPosts > 0 ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                      failed posts: {s.failedPosts}
                    </span>
                  ) : null}
                </div>
              </>
            );
          })()}

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                QR shortcut
              </p>
              <p className="font-mono text-sm text-zinc-800 dark:text-zinc-200">
                /r/{selected.slug}
              </p>
            </div>
            <CopyQrButton slug={selected.slug} />
            <Link
              href={`/dashboard/locations/${selected.id}/posts`}
              className="ml-auto text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
            >
              Posts →
            </Link>
          </div>

          <p className="mt-3 text-sm text-zinc-500">
            {/* plain anchor: clears any persisted selection (cookie) via the
                selection API, then lands back on the all-locations table */}
            <a
              href="/api/dashboard/selection?loc=all&next=%2Fdashboard"
              className="underline offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              ← Back to all locations
            </a>
          </p>
        </div>
      ) : (
        /* ---------------- combined / aggregate view (FR-21) ---------------- */
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/api/auth/gbp/start"
              prefetch={false}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Connect Google Business Profile
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total reviews" value={String(totalReviews)} />
            <Stat label="Avg rating" value={fmtAvg(ratingSum, totalReviews)} />
            <Stat label="Awaiting reply" value={String(awaitingReply)} />
            <Stat label="Pending approvals" value={String(pendingApprovals)} />
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">QR link</th>
                  <th className="px-4 py-3">Reviews</th>
                  <th className="px-4 py-3">Avg</th>
                  <th className="px-4 py-3">Posts</th>
                  <th className="px-4 py-3">Google</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {locations.map((l) => {
                  const s = stats.get(l.id) ?? emptyStats();
                  return (
                    <tr key={l.id}>
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        <Link
                          href={`/dashboard/locations/${l.id}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {l.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {l.city ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        /r/{l.slug}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {s.reviews}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {fmtAvg(s.ratingSum, s.reviews)}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {s.pendingPosts > 0 ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {s.pendingPosts} pending
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {l.connection_status === "connected" ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                            Connected
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Needs reconnect
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {l.connection_status !== "connected" ? (
                          <Link
                            href={`/api/auth/gbp/start?location_id=${l.id}`}
                            prefetch={false}
                            className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
                          >
                            Reconnect
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasBroken ? (
            <p className="mt-3 text-xs text-zinc-500">
              Locations marked “Needs reconnect” only affect themselves — other
              locations keep syncing.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
