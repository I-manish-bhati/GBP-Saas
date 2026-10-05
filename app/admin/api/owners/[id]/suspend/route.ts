import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const schema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { data: rows } = await db
    .from("owners")
    .select("id, suspended_at")
    .eq("id", id)
    .limit(1);
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (rows[0].suspended_at) {
    return NextResponse.json({ ok: true, already: "suspended" });
  }

  const suspendedAt = new Date().toISOString();
  const { error: updErr } = await db
    .from("owners")
    .update({ suspended_at: suspendedAt })
    .eq("id", id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const { error: auditErr } = await db.from("admin_actions").insert({
    admin_id: guard.adminId,
    action: "suspend_owner",
    target_type: "owner",
    target_id: id,
    detail: parsed.data.reason ? { reason: parsed.data.reason } : null,
  });
  if (auditErr) {
    console.error("admin_actions insert failed:", auditErr.message);
  }

  return NextResponse.json({ ok: true, suspended_at: suspendedAt });
}
