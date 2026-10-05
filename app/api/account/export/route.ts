import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/account/export — downloadable JSON of the owner's own data
 * (profile, locations, billing, reviews, posts, QR submissions, bell items,
 * AI activity). Explicit column lists: secrets are never selected —
 * password_hash, Google access/refresh tokens and auth token hashes stay out.
 */
export async function GET() {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit({
    bucket: "account:export",
    key: claims.sub,
    limit: 5,
    windowMs: 60 * 60_000,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many export attempts. Please try again later." },
      { status: 429 }
    );
  }

  const [
    ownerRes,
    locRes,
    subRes,
    payRes,
    notifRes,
  ] = await Promise.all([
    db
      .from("owners")
      .select("id, email, name, email_verified, created_at, notification_prefs")
      .eq("id", claims.sub)
      .limit(1),
    db
      .from("locations")
      .select(
        "id, google_location_id, name, category, short_description, specialties, city, language, google_place_id, connection_status, slug, qr_template, brand_color, tagline, created_at"
      )
      .eq("owner_id", claims.sub)
      .order("created_at", { ascending: true }),
    db
      .from("subscriptions")
      .select("*")
      .eq("owner_id", claims.sub)
      .limit(1),
    db
      .from("payments")
      .select(
        "id, order_id, razorpay_payment_id, amount, currency, status, target_quantity, failure_reason, created_at"
      )
      .eq("owner_id", claims.sub)
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("notifications")
      .select("type, reference_id, created_at")
      .eq("owner_id", claims.sub)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const locations = locRes.data ?? [];
  const locIds = locations.map((l) => l.id);

  const empty: never[] = [];
  const byLoc = async (
    table: "reviews" | "posts" | "review_submissions" | "ai_generation_logs",
    columns: string
  ) => {
    if (locIds.length === 0) return empty;
    const { data } = await db
      .from(table)
      .select(columns)
      .in("location_id", locIds)
      .limit(2000);
    return data ?? empty;
  };

  const [reviews, posts, submissions, aiLogs] = await Promise.all([
    byLoc(
      "reviews",
      "id, location_id, google_review_id, reviewer_name, rating, review_text, ai_reply_draft, final_reply, status, replied_at, fetched_at, updated_at"
    ),
    byLoc(
      "posts",
      "id, location_id, ai_generated_text, final_text, status, auto_publish_at, published_at, google_post_id, created_at, updated_at"
    ),
    byLoc(
      "review_submissions",
      "id, location_id, customer_id, rating, tags, ai_draft, final_text, clicked_google_post, created_at"
    ),
    byLoc(
      "ai_generation_logs",
      "id, location_id, type, model_used, created_at"
    ),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    profile: ownerRes.data?.[0] ?? null,
    locations,
    subscriptions: subRes.data ?? [],
    payments: payRes.data ?? [],
    reviews,
    posts,
    review_submissions: submissions,
    notifications: notifRes.data ?? [],
    ai_generation_logs: aiLogs,
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="gbp-suite-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
