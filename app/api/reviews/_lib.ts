import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner, isAuthResponse } from "@/lib/auth/guards";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Review → location → owner scoping for all /api/reviews/[id]/* routes. */
export async function resolveReview(
  reviewId: string,
  ownerId: string
): Promise<
  | { ok: true; locationId: string }
  | { ok: false; response: NextResponse }
> {
  if (!UUID_RE.test(reviewId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  const { data: reviews } = await db
    .from("reviews")
    .select("id, location_id, locations ( id, owner_id )")
    .eq("id", reviewId)
    .limit(1);
  const review = reviews?.[0] as
    | { id: string; location_id: string; locations: { id: string; owner_id: string } | null }
    | undefined;
  if (!review || !review.locations || review.locations.owner_id !== ownerId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return { ok: true, locationId: review.location_id };
}

export async function guardReview(
  reviewId: string
): Promise<{ ownerId: string; locationId: string } | NextResponse> {
  const owner = await requireOwner({ requireVerified: true });
  if (isAuthResponse(owner)) return owner;
  const resolved = await resolveReview(reviewId, owner.ownerId);
  if (!resolved.ok) return resolved.response;
  return { ownerId: owner.ownerId, locationId: resolved.locationId };
}
