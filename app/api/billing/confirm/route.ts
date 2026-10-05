import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner, isAuthResponse } from "@/lib/auth/guards";
import {
  BillingNotConfiguredError,
  fetchOrder,
  verifyCheckoutSignature,
} from "@/lib/razorpay";
import { activateSlot } from "@/lib/billing/slots";

export const runtime = "nodejs";

const confirmSchema = z.object({
  order_id: z.string().min(1).max(100),
  payment_id: z.string().min(1).max(100),
  signature: z.string().min(1).max(256),
});

/**
 * Client checkout callback: verifies the Razorpay checkout signature and the
 * server-fetched order notes, then funnels into the same idempotent
 * `activateSlot()` as the webhook — whichever arrives first wins, the other
 * becomes a no-op.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const owner = await requireOwner({ requireVerified: true });
  if (isAuthResponse(owner)) return owner;

  const raw = (await req.json().catch(() => (null))) as unknown;
  const parsed = confirmSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing payment callback data." },
      { status: 400 }
    );
  }
  const { order_id: orderId, payment_id: paymentId, signature } = parsed.data;
  if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
    return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
  }

  try {
    const order = await fetchOrder(orderId);
    const notes = order.notes ?? {};
    if (notes.kind !== "ai_slot" || notes.owner_id !== owner.ownerId) {
      return NextResponse.json({ error: "Order does not belong to you." }, { status: 403 });
    }
    const target = Number(notes.target_quantity);
    if (!Number.isInteger(target) || target < 1) {
      return NextResponse.json({ error: "Invalid order notes." }, { status: 400 });
    }
    const result = await activateSlot({
      ownerId: owner.ownerId,
      targetQuantity: target,
      orderId,
      paymentId,
      amount: typeof order.amount === "number" ? order.amount : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof BillingNotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    console.error("[billing] confirm failed:", e);
    return NextResponse.json(
      { error: "Could not confirm payment. It will settle automatically via webhook." },
      { status: 502 }
    );
  }
}
