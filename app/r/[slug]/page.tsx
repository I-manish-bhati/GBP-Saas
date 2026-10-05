import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { InAppBanner } from "./inapp-banner";
import { ReviewFlow } from "./review-flow";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]{1,80}$/i;

interface TagRow {
  label: string;
  min_rating: number;
  max_rating: number;
  category: string | null;
}

export default async function ReviewLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) notFound();

  const { data: locRows } = await db
    .from("locations")
    .select(
      "id, name, city, language, tagline, brand_color, google_place_id, connection_status"
    )
    .eq("slug", slug)
    .limit(1);
  const loc = locRows && locRows.length > 0 ? locRows[0] : null;
  if (!loc) notFound();

  if (loc.connection_status !== "connected") {
    return (
      <main className="mx-auto w-full flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          This QR code is no longer active
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Ask the business for an updated code, or find them on Google to leave
          a review.
        </p>
      </main>
    );
  }

  const token = await getSessionToken("customer");
  const claims = token ? await verifySession(token, "customer") : null;

  const { data: tagRows } = await db
    .from("tag_options")
    .select("label, min_rating, max_rating, category")
    .eq("language", loc.language)
    .order("min_rating");

  const sp = await searchParams;
  const loginError = typeof sp.login_error === "string" ? sp.login_error : null;

  const devLoginAvailable =
    process.env.NODE_ENV !== "production" &&
    !process.env.GOOGLE_CUSTOMER_OAUTH_CLIENT_ID;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pb-16 pt-6">
      <InAppBanner />
      <header className="text-center">
        <p className="text-xs uppercase tracking-widest text-zinc-400">
          Google review
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {loc.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{loc.city ?? "Share your experience"}</p>
        {loc.tagline ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{loc.tagline}</p>
        ) : null}
      </header>

      <ReviewFlow
        slug={slug}
        isAuthenticated={Boolean(claims)}
        devLoginAvailable={devLoginAvailable}
        loginError={loginError}
        tags={(tagRows ?? []) as TagRow[]}
        location={{
          name: loc.name,
          city: loc.city,
          google_place_id: loc.google_place_id,
        }}
      />

      <footer className="mt-8 text-center text-xs text-zinc-400">
        <a href="/privacy" className="underline hover:text-zinc-600">
          Privacy
        </a>
        <span className="mx-2">·</span>
        <a href="/terms" className="underline hover:text-zinc-600">
          Terms
        </a>
      </footer>
    </main>
  );
}
