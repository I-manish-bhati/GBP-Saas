import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { requireActiveSubscription } from "@/lib/billing/subscription";
import { SyncButton } from "./sync-button";
import { ReviewList, type ReviewRow } from "./review-list";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ["all", "pending", "drafted", "replied", "skipped"] as const;

export default async function LocationReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) notFound();

  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { data: locRows } = await db
    .from("locations")
    .select("id, owner_id, name, city, slug, connection_status")
    .eq("id", id)
    .limit(1);
  const loc = locRows?.[0];
  if (!loc || loc.owner_id !== claims.sub) notFound();

  const sp = await searchParams;
  const rawStatus = typeof sp.status === "string" ? sp.status : "all";
  const status = (STATUSES as readonly string[]).includes(rawStatus)
    ? rawStatus
    : "all";

  let query = db
    .from("reviews")
    .select(
      "id, rating, reviewer_name, review_text, status, ai_reply_draft, final_reply, replied_at, fetched_at"
    )
    .eq("location_id", id)
    .is("deleted_at", null)
    .order("fetched_at", { ascending: false })
    .limit(100);
  if (status !== "all") query = query.eq("status", status);
  const { data: reviewRows } = await query;

  const gate = await requireActiveSubscription(claims.sub, id);
  const canUseAi = gate.ok;
  const upgradeHint = gate.ok ? "" : gate.error;

  const counts: Record<string, number> = { all: (reviewRows ?? []).length };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:text-zinc-400"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {loc.name}
          </h1>
          <p className="text-sm text-zinc-500">
            {loc.city ?? "—"} · QR link <span className="font-mono">/r/{loc.slug}</span>
            {loc.connection_status !== "connected" ? (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Google reconnect needed
              </span>
            ) : null}
          </p>
        </div>
        <SyncButton locationId={loc.id} />
      </div>

      {!canUseAi ? (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          {upgradeHint}{" "}
          <Link href="/dashboard/billing" className="font-medium underline">
            View billing →
          </Link>
        </div>
      ) : null}

      <nav className="mt-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <Link
          href={`/dashboard/locations/${loc.id}`}
          className="border-b-2 border-zinc-900 px-3 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
        >
          Reviews
        </Link>
        <Link
          href={`/dashboard/locations/${loc.id}/posts`}
          className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Posts
        </Link>
        <Link
          href={`/dashboard/locations/${loc.id}/qr`}
          className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          QR
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/dashboard/locations/${loc.id}${s === "all" ? "" : `?status=${s}`}`}
            className={
              status === s
                ? "border-b-2 border-zinc-900 px-3 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }
          >
            {s[0].toUpperCase() + s.slice(1)}{" "}
            {counts[s] !== undefined && counts[s] > 0 ? `(${counts[s]})` : ""}
          </Link>
        ))}
      </nav>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <ReviewList
          reviews={(reviewRows ?? []) as ReviewRow[]}
          canUseAi={canUseAi}
          upgradeHint={upgradeHint}
        />
      </div>
    </div>
  );
}
