import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardLocation } from "../../_lib";

export const runtime = "nodejs";

const MAX_IMAGES_PER_LOCATION = 30;

function isCloudinaryUrl(url: unknown): boolean {
  return (
    typeof url === "string" &&
    url.length < 2000 &&
    url.startsWith("https://") &&
    /^https:\/\/[a-z0-9.-]+\.cloudinary\.com\//i.test(url)
  );
}

const uploadSchema = z.object({
  cloudinary_public_id: z.string().trim().min(1).max(255),
  image_url: z.string().max(2000).refine(isCloudinaryUrl, {
    message: "Invalid upload payload",
  }),
  caption: z.string().optional(),
});

/**
 * Saves a row after the browser uploaded *directly* to Cloudinary
 * (M6: file never routes through the Next server).
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ locationId: string }> }
) {
  const { locationId } = await ctx.params;
  const guard = await guardLocation(locationId);
  if (guard instanceof NextResponse) return guard;

  const raw = (await req.json().catch(() => ({}))) as unknown;
  const parsed = uploadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
  }
  const caption = parsed.data.caption?.trim().slice(0, 300) || null;

  const { count } = await db
    .from("location_images")
    .select("id", { count: "exact", head: true })
    .eq("location_id", guard.locationId);
  if (typeof count === "number" && count >= MAX_IMAGES_PER_LOCATION) {
    return NextResponse.json(
      { error: `Image limit reached (${MAX_IMAGES_PER_LOCATION}).`, code: "IMAGE_LIMIT" },
      { status: 409 }
    );
  }

  const { data, error } = await db
    .from("location_images")
    .insert({
      location_id: guard.locationId,
      image_url: parsed.data.image_url,
      cloudinary_public_id: parsed.data.cloudinary_public_id,
      caption,
    })
    .select("id, image_url, cloudinary_public_id, caption, uploaded_at")
    .single();
  if (error || !data) {
    console.error("[images] insert failed:", error?.message);
    return NextResponse.json({ error: "Could not save image." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, image: data }, { status: 201 });
}
