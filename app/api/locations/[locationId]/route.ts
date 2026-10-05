import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardLocation } from "../_lib";
import { isQrTemplateId } from "@/lib/qr/render";

export const runtime = "nodejs";

const patchSchema = z.object({
  qr_template: z
    .string()
    .refine(isQrTemplateId, { message: "Unknown QR template" })
    .optional(),
  brand_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { message: "brand_color must be #rrggbb" })
    .nullable()
    .optional(),
  tagline: z.string().trim().max(120).nullable().optional(),
});

/** QR settings per location (M9 owner side): qr_template/brand_color/tagline. */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ locationId: string }> }
): Promise<NextResponse> {
  const { locationId } = await ctx.params;
  const guard = await guardLocation(locationId);
  if (guard instanceof NextResponse) return guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid settings." },
      { status: 400 }
    );
  }
  const patch = parsed.data;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No settings provided." }, { status: 400 });
  }

  const { data, error } = await db
    .from("locations")
    .update(patch)
    .eq("id", locationId)
    .eq("owner_id", guard.ownerId)
    .select("id, qr_template, brand_color, tagline");
  if (error) {
    console.error("[qr settings] update failed:", error.message);
    return NextResponse.json({ error: "Could not save settings." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, location: data?.[0] ?? null });
}
