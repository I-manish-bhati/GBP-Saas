import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { requireActiveSubscription } from "@/lib/billing/subscription";
import { ImageGallery, type ImageRow } from "../image-gallery";
import { PostGenerateForm } from "../post-generate-form";
import { PostList, type PostRow } from "../post-list";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LocationPostsPage({
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

  const sp = await searchParams;
  const highlightId =
    typeof sp.post === "string" && UUID_RE.test(sp.post) ? sp.post : null;

  const { data: locRows } = await db
    .from("locations")
    .select("id, owner_id, name, city, slug, connection_status")
    .eq("id", id)
    .limit(1);
  const loc = locRows?.[0];
  if (!loc || loc.owner_id !== claims.sub) notFound();

  const [{ data: imageRows }, { data: postRows }] = await Promise.all([
    db
      .from("location_images")
      .select("id, image_url, cloudinary_public_id, caption, uploaded_at")
      .eq("location_id", id)
      .order("uploaded_at", { ascending: false })
      .limit(60),
    db
      .from("posts")
      .select(
        "id, status, ai_generated_text, final_text, auto_publish_at, published_at, google_post_id, created_at"
      )
      .eq("location_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const gate = await requireActiveSubscription(claims.sub, id);
  const canUseAi = gate.ok;
  const upgradeHint = gate.ok ? "" : gate.error;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
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
      </div>

      {!canUseAi ? (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          {upgradeHint}{" "}
          <Link href="/dashboard/billing" className="font-medium underline">
            View billing →
          </Link>
        </div>
      ) : null}

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase text-zinc-500">Images</h2>
        <ImageGallery
          locationId={loc.id}
          images={(imageRows ?? []) as ImageRow[]}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase text-zinc-500">
          Generate post
        </h2>
        <PostGenerateForm
          locationId={loc.id}
          images={(imageRows ?? []) as ImageRow[]}
          canUseAi={canUseAi}
          upgradeHint={upgradeHint}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase text-zinc-500">Posts</h2>
        <div className="mt-2 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <PostList
            posts={(postRows ?? []) as PostRow[]}
            canUseAi={canUseAi}
            upgradeHint={upgradeHint}
            highlightId={highlightId}
          />
        </div>
      </section>
    </div>
  );
}
