import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner, isAuthResponse } from "@/lib/auth/guards";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Dismiss (delete) one notification — owner-scoped and idempotent. */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const owner = await requireOwner();
  if (isAuthResponse(owner)) return owner;

  const { error } = await db
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("owner_id", owner.ownerId);
  if (error) {
    console.error("[notifications] dismiss failed:", error.message);
    return NextResponse.json(
      { error: "Could not dismiss notification." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
