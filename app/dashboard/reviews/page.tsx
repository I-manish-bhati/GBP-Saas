import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { requireActiveSubscription } from "@/lib/billing/subscription";
import { ReviewList, type ReviewRow } from "../locations/[id]/review-list";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "pending", "drafted", "replied", "skipped"] as const;
const LIMIT = 150;

/**
 * All-locations reviews view (multi-location owners): the sidebar's
 * "All locations" lands here instead of the dashboard table. Every row
 * carries a location pill, and the AI gate is resolved per row from its
 * location's billed slot.
 */
export default async function AllReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) notFound();

  const { data: locRows } = await db
    .from("locations")
    .select("id, name, city")
    .eq("owner_id", claims.sub)
    .order("created_at", { ascending: true });
  const locations = (locRows ?? []) as { id: string; name: string; city: string | null }[];
  const ids = locations.map((l) => l.id);

  const sp = await searchParams;
  const rawStatus = typeof sp.status === "string" ? sp.status : "all";
  const status = (STATUSES as readonly string[]).includes(rawStatus)
    ? rawStatus
    : "all";

  let rawRows: {
    id: string;
    location_id: string;
    rating: number;
    reviewer_name: string | null;
    review_text: string | null;
    status: ReviewRow["status"];
    ai_reply_draft: string | null;
    final_reply: string | null;
    replied_at: string | null;
    fetched_at: string;
  }[] = [];
  if (ids.length > 0) {
    const { data } = await db
      .from("reviews")
      .select(
        "id, location_id, rating, reviewer_name, review_text, status, ai_reply_draft, final_reply, replied_at, fetched_at"
      )
      .in("location_id", ids)
      .is("deleted_at", null)
      .order("fetched_at", { ascending: false })
      .limit(LIMIT);
    rawRows = (data ?? []) as typeof rawRows;
  }

  const locById = new Map(locations.map((l) => [l.id, l]));
  const allRows = rawRows.map(({ location_id, ...r }) => {
    const loc = locById.get(location_id);
    return {
      ...r,
      locationId: location_id,
      locationName: loc?.name,
      locationCity: loc?.city ?? null,
    };
  });
  const counts: Record<string, number> = { all: allRows.length };
  for (const r of allRows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const rows = allRows.filter((r) => status === "all" || r.status === status);

  const gates: Record<string, { ok: boolean; error: string }> = {};
  await Promise.all(
    locations.map(async (l) => {
      const g = await requireActiveSubscription(claims.sub, l.id);
      gates[l.id] = { ok: g.ok, error: g.ok ? "" : g.error };
    })
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Reviews
        </h1>
        <p className="text-sm text-zinc-500">
          All locations · {locations.length}{" "}
          {locations.length === 1 ? "location" : "locations"} · latest {LIMIT}{" "}
          reviews
        </p>
      </div>

      <nav className="mt-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={
              s === "all" ? "/dashboard/reviews" : `/dashboard/reviews?status=${s}`
            }
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
          reviews={rows as ReviewRow[]}
          canUseAi={false}
          upgradeHint=""
          gates={gates}
          emptyText={
            locations.length === 0
              ? "No locations yet. Connect your Google Business Profile to import them."
              : "No reviews across your locations yet. Open a location and hit “Sync reviews” to pull them from Google."
          }
        />
      </div>
    </div>
  );
}
