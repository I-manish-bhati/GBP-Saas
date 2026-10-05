import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: rows } = await db
    .from("owners")
    .select("id, suspended_at")
    .eq("id", id)
    .limit(1);
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!rows[0].suspended_at) {
    return NextResponse.json({ ok: true, already: "active" });
  }

  const { error: updErr } = await db
    .from("owners")
    .update({ suspended_at: null })
    .eq("id", id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const { error: auditErr } = await db.from("admin_actions").insert({
    admin_id: guard.adminId,
    action: "resume_owner",
    target_type: "owner",
    target_id: id,
    detail: null,
  });
  if (auditErr) {
    console.error("admin_actions insert failed:", auditErr.message);
  }

  return NextResponse.json({ ok: true, suspended_at: null });
}
