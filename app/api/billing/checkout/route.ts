import { NextResponse } from "next/server";
import { requireOwner, isAuthResponse } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { BillingNotConfiguredError, createSlotOrder, slotPriceInr } from "@/lib/razorpay";

export const runtime = "nodejs";

/**
 * FR-36 model: connecting locations is free; this buys the next AI slot.
 * target_quantity = billed quantity + 1 (raw — pending reductions never lower
 * the paid target). Activation (webhook/confirm) only raises the quantity, so
 * over-buying can't happen.
 */
export async function POST(): Promise<NextResponse> {
  const owner = await requireOwner({ requireVerified: true });
  if (isAuthResponse(owner)) return owner;

  try {
    const { data: subRows } = await db
      .from("subscriptions")
      .select("quantity")
      .eq("owner_id", owner.ownerId)
      .limit(1);
    const billed = subRows && subRows.length > 0 ? Number(subRows[0].quantity) || 0 : 0;
    const targetQuantity = billed + 1;

    const order = await createSlotOrder(owner.ownerId, targetQuantity);
    return NextResponse.json({
      ok: true,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
      priceInr: slotPriceInr(),
      targetQuantity,
    });
  } catch (e) {
    if (e instanceof BillingNotConfiguredError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    console.error("[billing] checkout failed:", e);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
