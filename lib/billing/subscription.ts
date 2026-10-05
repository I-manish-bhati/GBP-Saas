import "server-only";
import { db } from "@/lib/db";
import { effectiveQuantity } from "@/lib/billing/slots";

export type SubscriptionGate =
  | { ok: true; locationIndex: number }
  | { ok: false; code: "NO_SUBSCRIPTION" | "INACTIVE" | "LOCATION_LIMIT"; error: string };

/**
 * FR-35 billing gate: wraps AI-generate and publish actions (review replies,
 * post generation, QR review drafting). Checks the owner has an `active`
 * subscription and the location sits within the billed quantity (locations
 * ordered by signup time). Honors the M8 removal policy: a pending quantity
 * reduction applies only after the current period ends.
 */
export async function requireActiveSubscription(
  ownerId: string,
  locationId: string
): Promise<SubscriptionGate> {
  try {
    const { data: subs } = await db
      .from("subscriptions")
      .select("status, quantity, pending_quantity, current_period_end")
      .eq("owner_id", ownerId)
      .limit(1);

    const sub = subs && subs.length > 0 ? subs[0] : null;
    if (!sub) {
      return {
        ok: false,
        code: "NO_SUBSCRIPTION",
        error: "Upgrade to use AI and publishing features.",
      };
    }
    if (sub.status !== "active") {
      return {
        ok: false,
        code: "INACTIVE",
        error: "Your subscription is not active. Please update payment to continue.",
      };
    }

    const { data: locations } = await db
      .from("locations")
      .select("id")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true });

    const index = (locations ?? []).findIndex((l) => l.id === locationId);
    if (index === -1) {
      return { ok: false, code: "LOCATION_LIMIT", error: "Location not found." };
    }
    if (index >= effectiveQuantity(sub)) {
      return {
        ok: false,
        code: "LOCATION_LIMIT",
        error: "Upgrade to add more locations to your plan.",
      };
    }
    return { ok: true, locationIndex: index };
  } catch (e) {
    console.error("[billing] gate error:", e);
    return {
      ok: false,
      code: "NO_SUBSCRIPTION",
      error: "Upgrade to use AI and publishing features.",
    };
  }
}
