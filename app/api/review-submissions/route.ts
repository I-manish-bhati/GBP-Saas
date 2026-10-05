import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/customer";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const SUBMIT_IP_DAILY = 30;
const DAILY_PER_LOCATION_LIMIT = 3; // FR-32

const bodySchema = z.object({
  slug: z.string().min(1).max(80),
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).default([]),
  ai_draft: z.string().max(4096).nullable().optional(),
  final_text: z.string().trim().min(1).max(4096),
});

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function startOfUtcDay(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** M9 submission (FR-30/FR-32): saves the customer's final text + metadata. */
export async function POST(req: Request): Promise<NextResponse> {
  const customer = await requireCustomer();
  if (customer instanceof NextResponse) return customer;

  const ipLimit = await rateLimit({
    bucket: "submit:ip:day",
    key: clientIp(req),
    limit: SUBMIT_IP_DAILY,
    windowMs: 24 * 60 * 60_000,
  });
  if (!ipLimit.success) {
    return NextResponse.json(
      { error: "Too many submissions from this network. Try again tomorrow.", code: "IP_LIMIT" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission." },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const { data: locRows } = await db
    .from("locations")
    .select("id, connection_status")
    .eq("slug", input.slug)
    .limit(1);
  const loc = locRows && locRows.length > 0 ? locRows[0] : null;
  if (!loc || loc.connection_status !== "connected") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // FR-32: max 3 per (location, customer) per day (UTC day; index-backed).
  const { count } = await db
    .from("review_submissions")
    .select("id", { count: "exact", head: true })
    .eq("location_id", loc.id)
    .eq("customer_id", customer.customerId)
    .gte("created_at", startOfUtcDay());
  if ((count ?? 0) >= DAILY_PER_LOCATION_LIMIT) {
    return NextResponse.json(
      {
        error: "You've already submitted 3 reviews today — try again tomorrow",
        code: "DAILY_LIMIT",
      },
      { status: 429 }
    );
  }

  const { data: rows, error } = await db
    .from("review_submissions")
    .insert({
      location_id: loc.id,
      customer_id: customer.customerId,
      rating: input.rating,
      tags: input.tags,
      ai_draft: input.ai_draft ?? null,
      final_text: input.final_text,
    })
    .select("id");
  if (error || !rows || rows.length === 0) {
    console.error("[submissions] insert failed:", error?.message);
    return NextResponse.json({ error: "Could not save your review." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: rows[0].id }, { status: 201 });
}
