import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { handleRazorpayEvent } from "@/lib/billing/webhook-events";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * D6 webhook auth: HMAC-SHA256 over the raw body, verified against
 * RAZORPAY_WEBHOOK_SECRET. Unsigned/mismatched deliveries are rejected (401).
 *
 * Idempotency (M8): every delivery is recorded in razorpay_events keyed by
 * Razorpay's event id. Already-processed events replay as no-ops; 'received'
 * rows from a crashed attempt are reprocessed (activation itself is also
 * idempotent per order/target quantity).
 */
export async function POST(req: Request): Promise<NextResponse> {
  // D4 per-IP flood guard in front of signature/DB work.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = await rateLimit({
    bucket: "webhook:ip",
    key: ip,
    limit: 120,
    windowMs: 60_000,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many deliveries." },
      {
        status: 429,
        headers:
          limit.retryAfterMs !== null
            ? { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) }
            : undefined,
      }
    );
  }

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Billing webhook is not configured." },
      { status: 503 }
    );
  }
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const eventType = typeof body.event === "string" ? body.event : null;
  const eventId =
    typeof body.id === "string" && body.id
      ? body.id
      : "sha1_" + crypto.createHash("sha1").update(raw).digest("hex");

  const { error: insertError } = await db.from("razorpay_events").insert({
    event_id: eventId,
    event_type: eventType,
    payload: body,
    status: "received",
  });

  if (insertError) {
    if (insertError.code !== "23505") {
      console.error("[webhook] dedupe insert failed:", insertError.message);
      return NextResponse.json({ error: "Storage error." }, { status: 500 });
    }
    const { data: rows } = await db
      .from("razorpay_events")
      .select("status")
      .eq("event_id", eventId)
      .limit(1);
    const status = rows?.[0]?.status;
    if (status === "processed" || status === "ignored") {
      console.log(`[webhook] duplicate ${eventId} (${status}) -> no-op`);
      return NextResponse.json({ ok: true, duplicate: true });
    }
    // status 'received'/'failed': a previous attempt crashed — reprocess.
    console.log(`[webhook] retry ${eventId} (was ${status ?? "unknown"})`);
  }

  try {
    const outcome = await handleRazorpayEvent(body);
    await db
      .from("razorpay_events")
      .update({
        status: outcome,
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("event_id", eventId);
    return NextResponse.json({ ok: true, outcome });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[webhook] processing failed (${eventId}):`, message);
    await db
      .from("razorpay_events")
      .update({ status: "failed", error_message: message.slice(0, 500) })
      .eq("event_id", eventId);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}
