import "server-only";
import { db } from "@/lib/db";
import { activateSlot, markPaymentFailed } from "@/lib/billing/slots";
import { fetchOrder } from "@/lib/razorpay";

export type WebhookOutcome = "processed" | "ignored";

interface RazorpayEvent {
  id?: string;
  event?: string;
  payload?: Record<string, unknown>;
}

function entity(payload: unknown, key: string): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const bucket = p[key];
  if (!bucket || typeof bucket !== "object") return null;
  const e = (bucket as Record<string, unknown>).entity;
  return e && typeof e === "object" ? (e as Record<string, unknown>) : null;
}

function readSlotNotes(
  orderEntityNotes: unknown,
  orderId: string
): Promise<{ ownerId: string; targetQuantity: number } | null> {
  const parse = (notes: unknown): { ownerId: string; targetQuantity: number } | null => {
    if (!notes || typeof notes !== "object") return null;
    const n = notes as Record<string, unknown>;
    if (n.kind !== "ai_slot" || typeof n.owner_id !== "string") return null;
    const target = Number(n.target_quantity);
    if (!Number.isInteger(target) || target < 1) return null;
    return { ownerId: n.owner_id, targetQuantity: target };
  };

  const local = parse(orderEntityNotes);
  if (local) return Promise.resolve(local);
  // Some webhook payloads omit notes — fall back to a server round-trip.
  return fetchOrder(orderId)
    .then((o) => parse(o.notes))
    .catch(() => null);
}

/**
 * Maps Razorpay webhook events to subscription state (M8 task map):
 * - payment.charged  -> activateSlot (idempotent qty bump / first activation)
 * - payment.failed   -> status='past_due' + notify(ownerId,'payment_failed')
 * - subscription.*   -> keep status/quantity/period in sync (defensive: the
 *                       provisional Orders flow doesn't create Razorpay subs)
 * - anything else    -> ignored
 */
export async function handleRazorpayEvent(body: RazorpayEvent): Promise<WebhookOutcome> {
  const event = typeof body.event === "string" ? body.event : "";
  const payload = body.payload ?? null;

  if (event === "payment.charged") {
    const payment = entity(payload, "payment");
    const order = entity(payload, "order");
    const orderId =
      (typeof order?.id === "string" && order.id) ||
      (typeof payment?.order_id === "string" && payment.order_id) ||
      null;
    if (!orderId) throw new Error("payment.charged without order id");
    const notes = await readSlotNotes(order?.notes, orderId);
    if (!notes) return "ignored";
    const paymentId = typeof payment?.id === "string" ? payment.id : undefined;
    const amount = typeof payment?.amount === "number" ? payment.amount : undefined;
    await activateSlot({
      ownerId: notes.ownerId,
      targetQuantity: notes.targetQuantity,
      orderId,
      paymentId,
      amount,
    });
    return "processed";
  }

  if (event === "payment.failed") {
    const payment = entity(payload, "payment");
    const order = entity(payload, "order");
    const orderId =
      (typeof order?.id === "string" && order.id) ||
      (typeof payment?.order_id === "string" && payment.order_id) ||
      null;
    if (!orderId) return "ignored";
    const notes = await readSlotNotes(order?.notes, orderId);
    if (!notes) return "ignored";
    const paymentId = typeof payment?.id === "string" ? payment.id : undefined;
    const amount = typeof payment?.amount === "number" ? payment.amount : undefined;
    const failureReason =
      typeof payment?.error_description === "string" && payment.error_description
        ? payment.error_description
        : null;
    await markPaymentFailed(notes.ownerId, {
      orderId,
      paymentId,
      amount,
      failureReason,
    });
    return "processed";
  }

  if (event.startsWith("subscription.")) {
    const rzpSub = entity(payload, "subscription");
    const rzpSubId = typeof rzpSub?.id === "string" ? rzpSub.id : null;
    if (!rzpSubId) return "ignored";
    const { data: rows } = await db
      .from("subscriptions")
      .select("id, status")
      .eq("razorpay_subscription_id", rzpSubId)
      .limit(1);
    const sub = rows && rows.length > 0 ? rows[0] : null;
    if (!sub) return "ignored";

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (event === "subscription.cancelled" || event === "subscription.halted") {
      patch.status = "cancelled";
    } else if (
      event === "subscription.charged" ||
      event === "subscription.active" ||
      event === "subscription.activated"
    ) {
      patch.status = "active";
      if (typeof rzpSub?.quantity === "number" && rzpSub.quantity >= 0) {
        patch.quantity = rzpSub.quantity;
      }
      const end = rzpSub?.current_end;
      if (typeof end === "number" && end > 0) {
        patch.current_period_end = new Date(end * 1000).toISOString();
      }
    } else {
      return "ignored";
    }
    const { error } = await db.from("subscriptions").update(patch).eq("id", sub.id);
    if (error) throw new Error(`subscription event update failed: ${error.message}`);
    return "processed";
  }

  return "ignored";
}
