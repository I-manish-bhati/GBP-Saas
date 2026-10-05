import "server-only";
import { db } from "@/lib/db";

export const OWNERS_PAGE_SIZE = 20;

export interface OwnerListItem {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  suspended_at: string | null;
  locationCount: number;
  subscription: {
    status: string;
    plan_id: string | null;
    quantity: number;
    current_period_end: string | null;
  } | null;
}

// PostgREST parses or= terms itself — strip its metacharacters from search input.
function sanitizeTerm(term: string): string {
  return term.replace(/[%(),.]/g, " ").trim();
}

// PostgREST may return an embedded to-one relation as object or 1-row array.
function toOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listOwners(opts: {
  search: string;
  page: number;
}): Promise<{ owners: OwnerListItem[]; total: number; page: number }> {
  const page = Math.max(1, opts.page);
  const from = (page - 1) * OWNERS_PAGE_SIZE;

  let query = db
    .from("owners")
    .select(
      "id, email, name, created_at, suspended_at, subscriptions(status, plan_id, quantity, current_period_end), locations(id)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + OWNERS_PAGE_SIZE - 1);

  const term = sanitizeTerm(opts.search);
  if (term) query = query.or(`email.ilike.%${term}%,name.ilike.%${term}%`);

  const { data, count, error } = await query;
  if (error || !data) {
    throw new Error(`listOwners failed: ${error?.message ?? "no data"}`);
  }

  const owners: OwnerListItem[] = data.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    created_at: row.created_at,
    suspended_at: row.suspended_at,
    locationCount: Array.isArray(row.locations) ? row.locations.length : 0,
    subscription: toOne(row.subscriptions),
  }));

  return { owners, total: count ?? 0, page };
}

function embeddedCount(
  value: unknown
): number {
  if (Array.isArray(value) && value.length > 0 && value[0] && typeof value[0] === "object") {
    const n = (value[0] as { count?: number }).count;
    return typeof n === "number" ? n : 0;
  }
  return 0;
}

export interface OwnerDetail {
  owner: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    email_verified: boolean;
    created_at: string;
    suspended_at: string | null;
  };
  subscription: {
    status: string;
    plan_id: string | null;
    quantity: number;
    currency: string;
    current_period_end: string | null;
    razorpay_subscription_id: string | null;
    created_at: string;
  } | null;
  locations: Array<{
    id: string;
    name: string;
    city: string | null;
    slug: string;
    connection_status: string;
    created_at: string;
    counts: { reviews: number; posts: number; submissions: number; syncLogs: number; aiLogs: number };
  }>;
  logs: {
    syncLogs: Array<{
      id: string;
      operation: string;
      status: string;
      error_message: string | null;
      created_at: string;
      location_id: string | null;
    }>;
    aiLogs: Array<{
      id: string;
      type: string;
      model_used: string | null;
      created_at: string;
      location_id: string;
    }>;
    reviews: Array<{
      id: string;
      rating: number;
      reviewer_name: string | null;
      status: string;
      fetched_at: string;
      location_id: string;
    }>;
    posts: Array<{
      id: string;
      status: string;
      final_text: string | null;
      created_at: string;
      location_id: string;
    }>;
    submissions: Array<{
      id: string;
      rating: number;
      final_text: string;
      created_at: string;
      location_id: string;
    }>;
  };
}

export async function getOwnerDetail(ownerId: string): Promise<OwnerDetail | null> {
  const { data: ownerRows, error: ownerErr } = await db
    .from("owners")
    .select("id, email, name, phone, email_verified, created_at, suspended_at")
    .eq("id", ownerId)
    .limit(1);
  if (ownerErr || !ownerRows || ownerRows.length === 0) return null;
  const owner = ownerRows[0];

  const [{ data: subs }, { data: locations }] = await Promise.all([
    db
      .from("subscriptions")
      .select(
        "status, plan_id, quantity, currency, current_period_end, razorpay_subscription_id, created_at"
      )
      .eq("owner_id", ownerId)
      .limit(1),
    db
      .from("locations")
      .select(
        "id, name, city, slug, connection_status, created_at, reviews(count), posts(count), review_submissions(count), sync_logs(count), ai_generation_logs(count)"
      )
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false }),
  ]);

  const locIds = (locations ?? []).map((l) => l.id);
  const scoped = locIds.length > 0;

  const empty: OwnerDetail["logs"] = {
    syncLogs: [],
    aiLogs: [],
    reviews: [],
    posts: [],
    submissions: [],
  };
  let logs = empty;
  if (scoped) {
    const ids = locIds;
    const [sync, ai, reviews, posts, submissions] = await Promise.all([
      db
        .from("sync_logs")
        .select("id, operation, status, error_message, created_at, location_id")
        .in("location_id", ids)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("ai_generation_logs")
        .select("id, type, model_used, created_at, location_id")
        .in("location_id", ids)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("reviews")
        .select("id, rating, reviewer_name, status, fetched_at, location_id")
        .in("location_id", ids)
        .order("fetched_at", { ascending: false })
        .limit(20),
      db
        .from("posts")
        .select("id, status, final_text, created_at, location_id")
        .in("location_id", ids)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("review_submissions")
        .select("id, rating, final_text, created_at, location_id")
        .in("location_id", ids)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    logs = {
      syncLogs: sync.data ?? [],
      aiLogs: ai.data ?? [],
      reviews: reviews.data ?? [],
      posts: posts.data ?? [],
      submissions: submissions.data ?? [],
    };
  }

  const locationRows: OwnerDetail["locations"] = (locations ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    city: l.city,
    slug: l.slug,
    connection_status: l.connection_status,
    created_at: l.created_at,
    counts: {
      reviews: embeddedCount(l.reviews),
      posts: embeddedCount(l.posts),
      submissions: embeddedCount(l.review_submissions),
      syncLogs: embeddedCount(l.sync_logs),
      aiLogs: embeddedCount(l.ai_generation_logs),
    },
  }));

  return {
    owner,
    subscription: toOne(subs),
    locations: locationRows,
    logs,
  };
}
