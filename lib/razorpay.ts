import "server-only";
import crypto from "node:crypto";

/**
 * M8 billing — Razorpay (server-side keys only, never shipped to the client).
 *
 * Provisional mechanism (spike pending Razorpay keys, see tasks.md M8):
 * every AI slot purchase is a server-created Order (₹SLOT_PRICE_INR) paid via
 * Razorpay Checkout; activation happens on the signed `payment.charged`
 * webhook (authoritative) or the client confirm callback — both funnel into
 * `activateSlot()` which is idempotent per order/target quantity.
 */

export const RAZORPAY_API = "https://api.razorpay.com/v1";

export class BillingNotConfiguredError extends Error {
  constructor() {
    super("Billing is not configured yet (Razorpay keys pending).");
    this.name = "BillingNotConfiguredError";
  }
}

/** Read at call time (not module load) so tests can set env per-case. */
export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function slotPriceInr(): number {
  const n = Number(process.env.SLOT_PRICE_INR ?? "299");
  return Number.isFinite(n) && n > 0 ? n : 299;
}

export interface SlotOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

function basicAuth(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new BillingNotConfiguredError();
  return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

/**
 * Create an order for the next AI slot. notes carry the activation contract:
 * kind='ai_slot', owner_id, target_quantity — both the webhook and the
 * confirm endpoint activate against the same target (idempotent).
 */
export async function createSlotOrder(
  ownerId: string,
  targetQuantity: number
): Promise<SlotOrder> {
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(slotPriceInr() * 100),
      currency: "INR",
      receipt: `slot_${ownerId.slice(0, 8)}_${targetQuantity}`,
      notes: {
        kind: "ai_slot",
        owner_id: ownerId,
        target_quantity: String(targetQuantity),
      },
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    amount?: number;
    currency?: string;
    error?: { description?: string };
  };
  if (!res.ok || !body.id) {
    throw new Error(
      `Razorpay order creation failed: ${body.error?.description ?? res.status}`
    );
  }
  return {
    orderId: body.id,
    amount: body.amount ?? Math.round(slotPriceInr() * 100),
    currency: body.currency ?? "INR",
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
  };
}

export interface FetchedOrder {
  id: string;
  status?: string;
  amount?: number;
  notes?: Record<string, string>;
}

/** Server round-trip validation for the client confirm callback. */
export async function fetchOrder(orderId: string): Promise<FetchedOrder> {
  const res = await fetch(`${RAZORPAY_API}/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: basicAuth() },
  });
  const body = (await res.json().catch(() => ({}))) as FetchedOrder & {
    error?: { description?: string };
  };
  if (!res.ok || !body.id) {
    throw new Error(`Razorpay order fetch failed: ${body.error?.description ?? res.status}`);
  }
  return body;
}

function hmacHex(value: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** D6 webhook auth: HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET). */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqualHex(hmacHex(rawBody, secret), signature);
}

/**
 * Checkout callback signature: HMAC-SHA256(`${order_id}|${payment_id}`,
 * RAZORPAY_KEY_SECRET) — defense in depth alongside the webhook.
 */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string | null
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !signature) return false;
  return safeEqualHex(hmacHex(`${orderId}|${paymentId}`, secret), signature);
}
