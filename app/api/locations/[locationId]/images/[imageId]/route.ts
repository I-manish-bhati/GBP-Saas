import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { destroyImage } from "@/lib/cloudinary/sign";
import { guardLocation, UUID_RE } from "../../../_lib";

export const runtime = "nodejs";

const MAX_CAPTION = 300;

const captionSchema = z.object({
  caption: z.string(),
});

async function resolveImage(
  locationId: string,
  imageId: string
): Promise<{ id: string; cloudinary_public_id: string } | null> {
  if (!UUID_RE.test(imageId)) return null;
  const { data } = await db
    .from("location_images")
    .select("id, cloudinary_public_id")
    .eq("id", imageId)
    .eq("location_id", locationId)
    .limit(1);
  return data?.[0] ?? null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ locationId: string; imageId: string }> }
) {
  const { locationId, imageId } = await ctx.params;
  const guard = await guardLocation(locationId);
  if (guard instanceof NextResponse) return guard;

  const image = await resolveImage(guard.locationId, imageId);
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const raw = (await req.json().catch(() => ({}))) as unknown;
  const parsed = captionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "caption must be a string" }, { status: 400 });
  }
  const caption = parsed.data.caption.trim().slice(0, MAX_CAPTION) || null;

  const { error } = await db
    .from("location_images")
    .update({ caption })
    .eq("id", image.id);
  if (error) {
    console.error("[images] caption update failed:", error.message);
    return NextResponse.json({ error: "Could not save caption." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, caption });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ locationId: string; imageId: string }> }
) {
  const { locationId, imageId } = await ctx.params;
  const guard = await guardLocation(locationId);
  if (guard instanceof NextResponse) return guard;

  const image = await resolveImage(guard.locationId, imageId);
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Best-effort remote cleanup (posts.source_image_id goes null via FK).
  const destroyed = await destroyImage(image.cloudinary_public_id);
  if (!destroyed.ok) {
    console.warn(`[images] cloudinary destroy failed: ${destroyed.error}`);
  }

  const { error } = await db.from("location_images").delete().eq("id", image.id);
  if (error) {
    console.error("[images] delete failed:", error.message);
    return NextResponse.json({ error: "Could not delete image." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, remoteDestroyed: destroyed.ok });
}
