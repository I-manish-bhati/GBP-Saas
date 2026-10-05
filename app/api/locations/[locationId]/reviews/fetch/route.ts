import { NextResponse } from "next/server";
import { requireOwner, isAuthResponse } from "@/lib/auth/guards";
import { fetchReviewsHandler } from "@/lib/google/reviews";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ locationId: string }> }
) {
  const guard = await requireOwner({ requireVerified: true });
  if (isAuthResponse(guard)) return guard;

  const { locationId } = await ctx.params;
  if (!UUID_RE.test(locationId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { db } = await import("@/lib/db");
  const { data } = await db
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("owner_id", guard.ownerId)
    .limit(1);
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await fetchReviewsHandler(locationId);
  if (!result.ok) {
    return NextResponse.json(
      { error: `Sync failed: ${result.error ?? "unknown error"}` },
      { status: 502 }
    );
  }
  return NextResponse.json(result);
}
