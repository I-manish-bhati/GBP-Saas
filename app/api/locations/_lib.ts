import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner, isAuthResponse } from "@/lib/auth/guards";

export const runtime = "nodejs";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Verified-owner scoping for all /api/locations/[locationId]/* routes. */
export async function guardLocation(
  locationId: string
): Promise<{ ownerId: string; locationId: string } | NextResponse> {
  const owner = await requireOwner({ requireVerified: true });
  if (isAuthResponse(owner)) return owner;
  if (!UUID_RE.test(locationId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { data } = await db
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("owner_id", owner.ownerId)
    .limit(1);
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return { ownerId: owner.ownerId, locationId };
}
