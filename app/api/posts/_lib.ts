import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner, isAuthResponse } from "@/lib/auth/guards";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Post → location → owner scoping for all /api/posts/[id]/* routes. */
export async function resolvePost(
  postId: string,
  ownerId: string
): Promise<
  | { ok: true; locationId: string }
  | { ok: false; response: NextResponse }
> {
  if (!UUID_RE.test(postId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  const { data: posts } = await db
    .from("posts")
    .select("id, location_id, locations ( id, owner_id )")
    .eq("id", postId)
    .limit(1);
  const post = posts?.[0] as
    | { id: string; location_id: string; locations: { id: string; owner_id: string } | null }
    | undefined;
  if (!post || !post.locations || post.locations.owner_id !== ownerId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return { ok: true, locationId: post.location_id };
}

export async function guardPost(
  postId: string
): Promise<{ ownerId: string; locationId: string; postId: string } | NextResponse> {
  const owner = await requireOwner({ requireVerified: true });
  if (isAuthResponse(owner)) return owner;
  const resolved = await resolvePost(postId, owner.ownerId);
  if (!resolved.ok) return resolved.response;
  return { ownerId: owner.ownerId, locationId: resolved.locationId, postId };
}
