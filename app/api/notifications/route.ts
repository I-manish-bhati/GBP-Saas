import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner, isAuthResponse } from "@/lib/auth/guards";

export const runtime = "nodejs";

interface NotifRow {
  id: string;
  type: string;
  reference_id: string | null;
  created_at: string;
  read_at: string | null;
}

/** FR-37: latest notifications + unread count for the dashboard bell. */
export async function GET(): Promise<NextResponse> {
  const owner = await requireOwner();
  if (isAuthResponse(owner)) return owner;

  const [{ data: rows, error }, { count: unread, error: uerr }] =
    await Promise.all([
      db
        .from("notifications")
        .select("id, type, reference_id, created_at, read_at")
        .eq("owner_id", owner.ownerId)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", owner.ownerId)
        .is("read_at", null),
    ]);
  if (error || uerr) {
    console.error("[notifications] list failed:", error?.message ?? uerr?.message);
    return NextResponse.json(
      { error: "Could not load notifications." },
      { status: 500 }
    );
  }

  const notifications = (rows ?? []) as NotifRow[];

  // Deep links for post_* need the post's location (reference_id is a post id).
  const postIds = notifications
    .filter((n) => n.type.startsWith("post_") && n.reference_id)
    .map((n) => n.reference_id as string);
  const locByPost = new Map<string, string>();
  if (postIds.length > 0) {
    const { data: posts } = await db
      .from("posts")
      .select("id, location_id")
      .in("id", postIds);
    for (const p of posts ?? []) locByPost.set(p.id, p.location_id);
  }

  return NextResponse.json({
    unread: unread ?? 0,
    notifications: notifications.map((n) => ({
      ...n,
      location_id: n.reference_id
        ? n.type.startsWith("post_")
          ? (locByPost.get(n.reference_id) ?? null)
          : n.type === "token_expired"
            ? n.reference_id
            : null
        : null,
    })),
  });
}
