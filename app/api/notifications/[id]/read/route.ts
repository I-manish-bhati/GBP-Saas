import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner, isAuthResponse } from "@/lib/auth/guards";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mark one notification read (owner-scoped, idempotent). */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const owner = await requireOwner();
  if (isAuthResponse(owner)) return owner;

  const { data, error } = await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", owner.ownerId)
    .is("read_at", null)
    .select("id");
  if (error) {
    console.error("[notifications] mark-one failed:", error.message);
    return NextResponse.json(
      { error: "Could not update notification." },
      { status: 500 }
    );
  }
  if ((data ?? []).length > 0) return NextResponse.json({ ok: true });

  // Empty update: either already read (idempotent ok) or not this owner's (404).
  const { data: existing } = await db
    .from("notifications")
    .select("id, read_at")
    .eq("id", id)
    .eq("owner_id", owner.ownerId)
    .limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, already: true });
  }
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
