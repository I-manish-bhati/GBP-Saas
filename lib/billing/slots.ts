import "server-only";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { slotPriceInr } from "@/lib/razorpay";

export interface SlotActivation {
  applied: boolean;
  quantity: number;
}

const PERIOD_DAYS = 30;

function periodEnd30d(): string {
  return new Date(Date.now() + PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

/**
 * Appends a row to the owner-visible payment history (Billing page). The
 * unique attempt key (order_id, razorpay_payment_id) + ignoreDuplicates make
 * webhook/confirm double-delivery a no-op. Best-effort: a history write
 * failure must never break activation or failure handling (logged loudly).
 */
async function recordPayment(params: {
  ownerId: string;
  status: "captured" | "failed";
  orderId?: string;
  paymentId?: string;
  amount?: number;
  targetQuantity?: number | null;
  failureReason?: string | null;
}): Promise<void> {
  if (!params.orderId || !params.paymentId) return;
  const { error } = await db.from("payments").upsert(
    {
      owner_id: params.ownerId,
      order_id: params.orderId,
      razorpay_payment_id: params.paymentId,
      amount: params.amount ?? Math.round(slotPriceInr() * 100),
      currency: "INR",
      status: params.status,
      target_quantity: params.targetQuantity ?? null,
      failure_reason: params.failureReason ?? null,
    },
    { onConflict: "order_id,razorpay_payment_id", ignoreDuplicates: true }
  );
  if (error) {
    console.error(
      `[billing] payment history write failed order=${params.orderId}: ${error.message}`
    );
  }
}

function logActivation(
  orderId: string | undefined,
  paymentId: string | undefined,
  ownerId: string,
  quantity: number,
  applied: boolean
): void {
  if (!orderId && !paymentId) return;
  console.log(
    `[billing] slot payment order=${orderId ?? "-"} payment=${paymentId ?? "-"} owner=${ownerId} -> quantity=${quantity}${applied ? "" : " (duplicate no-op)"}`
  );
}

/**
 * Idempotent slot activation. Both the webhook (`payment.charged`) and the
 * client confirm callback funnel here; the conditional `.lt("quantity", target)`
 * update makes duplicate deliveries no-ops (M8 exit: replay changes nothing).
 * First payment creates the subscription (status='active', period end +30d);
 * later payments keep the original cycle (slots share the owner's period).
 */
export async function activateSlot(params: {
  ownerId: string;
  targetQuantity: number;
  orderId?: string;
  paymentId?: string;
  amount?: number;
}): Promise<SlotActivation> {
  const { ownerId, targetQuantity, orderId, paymentId, amount } = params;
  if (!Number.isInteger(targetQuantity) || targetQuantity < 1) {
    throw new Error(`activateSlot: invalid target quantity ${targetQuantity}`);
  }
  const record = (): Promise<void> =>
    recordPayment({
      ownerId,
      status: "captured",
      orderId,
      paymentId,
      amount,
      targetQuantity,
    });

  const { data: existingRows } = await db
    .from("subscriptions")
    .select("id, status, quantity, current_period_end, pending_quantity")
    .eq("owner_id", ownerId)
    .limit(1);
  let sub = existingRows && existingRows.length > 0 ? existingRows[0] : null;

  if (!sub) {
    const { error } = await db.from("subscriptions").insert({
      owner_id: ownerId,
      status: "active",
      quantity: targetQuantity,
      currency: "INR",
      current_period_end: periodEnd30d(),
      updated_at: new Date().toISOString(),
    });
    if (error && !isUniqueViolation(error)) {
      throw new Error(`activateSlot insert failed: ${error.message}`);
    }
    const inserted = !error;
    const { data: rows } = await db
      .from("subscriptions")
      .select("id, status, quantity, current_period_end, pending_quantity")
      .eq("owner_id", ownerId)
      .limit(1);
    sub = rows && rows.length > 0 ? rows[0] : null;
    if (!sub) throw new Error("activateSlot: subscription row missing after insert");
    if (inserted) {
      // We created the subscription at the target quantity — done.
      logActivation(orderId, paymentId, ownerId, Number(sub.quantity), true);
      await record();
      return { applied: true, quantity: Number(sub.quantity) };
    }
    // Lost an insert race — fall through to the guarded update below.
  }

  if (Number(sub.quantity) >= targetQuantity) {
    // Duplicate/stale activation — nothing to do (event replay no-op).
    await record();
    return { applied: false, quantity: Number(sub.quantity) };
  }

  const { data: updated, error } = await db
    .from("subscriptions")
    .update({
      quantity: targetQuantity,
      status: "active",
      current_period_end: sub.current_period_end ?? periodEnd30d(),
      updated_at: new Date().toISOString(),
    })
    .eq("owner_id", ownerId)
    .lt("quantity", targetQuantity)
    .select("quantity");

  if (error) throw new Error(`activateSlot update failed: ${error.message}`);
  const applied = (updated ?? []).length > 0;
  const quantity = applied && updated && updated.length > 0
    ? Number(updated[0].quantity)
    : Number(sub.quantity);
  logActivation(orderId, paymentId, ownerId, quantity, applied);
  await record();
  return { applied, quantity };
}

/**
 * payment.failed → status='past_due' + notify(ownerId, 'payment_failed')
 * (M8 task map). Creates a past_due row if the owner has never paid.
 */
export async function markPaymentFailed(
  ownerId: string,
  extra?: {
    orderId?: string;
    paymentId?: string;
    amount?: number;
    failureReason?: string | null;
  }
): Promise<void> {
  const { data: rows } = await db
    .from("subscriptions")
    .select("id, status")
    .eq("owner_id", ownerId)
    .limit(1);
  const sub = rows && rows.length > 0 ? rows[0] : null;

  let subId: string | null = sub?.id ?? null;
  if (!sub) {
    const { error } = await db.from("subscriptions").insert({
      owner_id: ownerId,
      status: "past_due",
      quantity: 0,
      currency: "INR",
      current_period_end: null,
      updated_at: new Date().toISOString(),
    });
    if (error && !isUniqueViolation(error)) {
      throw new Error(`markPaymentFailed insert failed: ${error.message}`);
    }
    const { data: after } = await db
      .from("subscriptions")
      .select("id, status")
      .eq("owner_id", ownerId)
      .limit(1);
    subId = after?.[0]?.id ?? null;
    if (after?.[0] && after[0].status !== "past_due") {
      await db
        .from("subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("owner_id", ownerId);
    }
  } else if (sub.status !== "past_due") {
    const { error } = await db
      .from("subscriptions")
      .update({ status: "past_due", updated_at: new Date().toISOString() })
      .eq("owner_id", ownerId);
    if (error) throw new Error(`markPaymentFailed update failed: ${error.message}`);
  }

  await notify(ownerId, "payment_failed", subId ?? undefined);
  await recordPayment({
    ownerId,
    status: "failed",
    orderId: extra?.orderId,
    paymentId: extra?.paymentId,
    amount: extra?.amount,
    failureReason: extra?.failureReason ?? null,
  });
}

/**
 * Effective billed quantity honoring the removal policy: a requested slot
 * reduction (pending_quantity) only applies once the current period has ended
 * — no partial refund, removal takes effect at period end (documented M8).
 */
export function effectiveQuantity(sub: {
  quantity: number;
  pending_quantity: number | null;
  current_period_end: string | null;
} | null): number {
  if (!sub) return 0;
  const qty = Number(sub.quantity) || 0;
  if (sub.pending_quantity == null) return qty;
  const end = sub.current_period_end ? Date.parse(sub.current_period_end) : NaN;
  if (Number.isFinite(end) && Date.now() >= end) {
    return Math.max(0, Number(sub.pending_quantity));
  }
  return qty;
}

/**
 * Location-removal policy (M8): queue a slot reduction for period end. Called
 * by the location-removal flow when it lands; safe to call repeatedly
 * (idempotent while a reduction is already pending).
 */
export async function requestSlotReduction(ownerId: string): Promise<boolean> {
  const { data: rows } = await db
    .from("subscriptions")
    .select("quantity, pending_quantity")
    .eq("owner_id", ownerId)
    .limit(1);
  const sub = rows && rows.length > 0 ? rows[0] : null;
  if (!sub) return false;
  if (sub.pending_quantity != null) return false;
  if (Number(sub.quantity) <= 0) return false;
  const { error } = await db
    .from("subscriptions")
    .update({
      pending_quantity: Number(sub.quantity) - 1,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_id", ownerId)
    .is("pending_quantity", null);
  if (error) throw new Error(`requestSlotReduction failed: ${error.message}`);
  return true;
}
