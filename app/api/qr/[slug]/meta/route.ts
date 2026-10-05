import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * M9 public meta for the QR flow: everything the `/r/{slug}` page needs —
 * public location info + tag options for its language (client filters by
 * chosen rating, FR-28/NFR-7). Only `connected` locations serve.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{1,80}$/i.test(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: locRows } = await db
    .from("locations")
    .select(
      "id, name, city, language, tagline, brand_color, qr_template, google_place_id, connection_status"
    )
    .eq("slug", slug)
    .limit(1);
  const loc = locRows && locRows.length > 0 ? locRows[0] : null;
  if (!loc || loc.connection_status !== "connected") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: tagRows } = await db
    .from("tag_options")
    .select("label, min_rating, max_rating, category")
    .eq("language", loc.language)
    .order("min_rating");

  return NextResponse.json({
    location: {
      name: loc.name,
      city: loc.city,
      language: loc.language,
      tagline: loc.tagline,
      brand_color: loc.brand_color,
      qr_template: loc.qr_template,
      google_place_id: loc.google_place_id,
    },
    tags: tagRows ?? [],
  });
}
