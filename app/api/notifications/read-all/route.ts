import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner, isAuthResponse } from "@/lib/auth/guards";

export const runtime = "nodejs";

/** Mark every unread notification for this owner as read. */
export async function POST(): Promise<NextResponse> {
  const owner = await requireOwner();
  if (isAuthResponse(owner)) return owner;

  const { data, error } = await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("owner_id", owner.ownerId)
    .is("read_at", null)
    .select("id");
  if (error) {
    console.error("[notifications] mark-all failed:", error.message);
    return NextResponse.json(
      { error: "Could not update notifications." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, updated: (data ?? []).length });
}
