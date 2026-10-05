import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardLocation } from "../../_lib";
import { posterSvg, qrPng, reviewUrl } from "@/lib/qr/render";

export const runtime = "nodejs";

/**
 * M9 downloads (FR-25): `?format=svg` = composed print poster (vector),
 * `?format=png` = QR only at 800px (2x). `?disposition=attachment` forces a
 * file download with a filename; default is inline (page preview <img>).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ locationId: string }> }
): Promise<Response> {
  const { locationId } = await ctx.params;
  const guard = await guardLocation(locationId);
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "png" ? "png" : "svg";
  const download = url.searchParams.get("disposition") === "attachment";

  const { data } = await db
    .from("locations")
    .select("slug, name, tagline, brand_color, qr_template, city")
    .eq("id", locationId)
    .eq("owner_id", guard.ownerId)
    .limit(1);
  const loc = data && data.length > 0 ? data[0] : null;
  if (!loc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const target = reviewUrl(appUrl, loc.slug);
  const base = `location-${loc.slug}`;

  if (format === "png") {
    const buf = await qrPng(target);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": download
          ? `attachment; filename="${base}-qr.png"`
          : "inline",
        "Cache-Control": "no-store",
      },
    });
  }

  const svg = await posterSvg({
    url: target,
    shopName: loc.name,
    tagline: loc.tagline,
    brandColor: loc.brand_color,
    template: loc.qr_template ?? "minimal",
  });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": download
        ? `attachment; filename="${base}.svg"`
        : "inline",
      "Cache-Control": "no-store",
    },
  });
}
