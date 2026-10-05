import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { requireActiveSubscription } from "@/lib/billing/subscription";
import { PostList, type PostRow } from "../locations/[id]/post-list";

export const dynamic = "force-dynamic";

const LIMIT = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * All-locations posts view (multi-location owners): list only — images and
 * post generation stay on a location's page (both are per-location), each
 * row carries a location pill that opens it.
 */
export default async function AllPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) notFound();

  const sp = await searchParams;
  const highlightId =
    typeof sp.post === "string" && UUID_RE.test(sp.post) ? sp.post : null;

  const { data: locRows } = await db
    .from("locations")
    .select("id, name, city")
    .eq("owner_id", claims.sub)
    .order("created_at", { ascending: true });
  const locations = (locRows ?? []) as { id: string; name: string; city: string | null }[];
  const ids = locations.map((l) => l.id);

  let rawRows: {
    id: string;
    location_id: string;
    status: PostRow["status"];
    ai_generated_text: string | null;
    final_text: string | null;
    auto_publish_at: string | null;
    published_at: string | null;
    google_post_id: string | null;
    created_at: string;
  }[] = [];
  if (ids.length > 0) {
    const { data } = await db
      .from("posts")
      .select(
        "id, location_id, status, ai_generated_text, final_text, auto_publish_at, published_at, google_post_id, created_at"
      )
      .in("location_id", ids)
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    rawRows = (data ?? []) as typeof rawRows;
  }

  const locById = new Map(locations.map((l) => [l.id, l]));
  const rows = rawRows.map(({ location_id, ...r }) => {
    const loc = locById.get(location_id);
    return {
      ...r,
      locationId: location_id,
      locationName: loc?.name,
      locationCity: loc?.city ?? null,
    };
  });

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
          Posts
        </h1>
        <p className="text-sm text-zinc-500">
          All locations · {locations.length}{" "}
          {locations.length === 1 ? "location" : "locations"} · latest {LIMIT}{" "}
          posts · generate new posts from a location&rsquo;s page
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <PostList
          posts={rows as PostRow[]}
          canUseAi={false}
          upgradeHint=""
          gates={gates}
          highlightId={highlightId}
          emptyText={
            locations.length === 0
              ? "No locations yet. Connect your Google Business Profile to import them."
              : "No posts yet across your locations. Open a location to generate one."
          }
        />
      </div>

      <p className="mt-4 text-xs text-zinc-400">
        Images and post generation live on each location&rsquo;s page — click a
        location pill above.
      </p>
    </div>
  );
}
