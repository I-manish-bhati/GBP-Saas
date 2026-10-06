/* Reset end-to-end test state before `npx playwright test`:
 *   npx tsx scripts/reset-e2e.ts
 * Clears FR-32 daily review_submissions for the e2e test customers and
 * rebuilds the M10 notification fixtures deterministically (exactly 4 rows,
 * past created_at so the bell shows "ago", reference ids that deep-link). */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

for (const p of [".env.local", ".env"]) {
  const fp = resolve(process.cwd(), p);
  if (!existsSync(fp)) continue;
  for (const line of readFileSync(fp, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main(): Promise<void> {
  const { data: customers, error: cErr } = await db
    .from("customers")
    .select("id")
    .in("email", ["e2e-m9@example.com", "dev@example.com"]);
  if (cErr) throw new Error(cErr.message);
  const ids = (customers ?? []).map((c) => c.id);
  if (ids.length > 0) {
    const { error } = await db
      .from("review_submissions")
      .delete()
      .in("customer_id", ids);
    if (error) throw new Error(error.message);
  }

  // Billing-page history fixtures (paid + failed attempt for the owner account).
  const { data: owners, error: oErr } = await db
    .from("owners")
    .select("id")
    .eq("email", "test@example.com")
    .limit(1);
  if (oErr) throw new Error(oErr.message);
  const ownerId = owners?.[0]?.id;
  if (ownerId) {
    // M10 bell fixtures: rebuild from scratch so counts/links never drift
    // (other scripts and cascade deletes mutate these between runs).
    const { error: dErr } = await db
      .from("notifications")
      .delete()
      .eq("owner_id", ownerId);
    if (dErr) throw new Error(dErr.message);

    // post_ready/post_failed deep links resolve the location via the post row.
    const { data: locs, error: lErr } = await db
      .from("locations")
      .select("id")
      .eq("owner_id", ownerId)
      .order("created_at")
      .limit(1);
    if (lErr) throw new Error(lErr.message);
    const locId = locs?.[0]?.id ?? null;

    let postId: string | null = null;
    if (locId) {
      const { data: posts, error: qErr } = await db
        .from("posts")
        .select("id")
        .eq("location_id", locId)
        .limit(1);
      if (qErr) throw new Error(qErr.message);
      postId = posts?.[0]?.id ?? null;
      if (!postId) {
        const { data: created, error: cErr } = await db
          .from("posts")
          .insert({
            location_id: locId,
            status: "awaiting_approval",
            ai_generated_text:
              "Fixture post for e2e tests: visit us today for a warm welcome and great service.",
            final_text:
              "Fixture post for e2e tests: visit us today for a warm welcome and great service.",
            auto_publish_at: null,
          })
          .select("id")
          .single();
        if (cErr) throw new Error(cErr.message);
        postId = created.id;
      }
    }

    const hoursAgo = (h: number): string =>
      new Date(Date.now() - h * 3_600_000).toISOString();
    const fixtures = [
      { type: "post_failed", reference_id: postId, created_at: hoursAgo(2) },
      { type: "post_ready", reference_id: postId, created_at: hoursAgo(4) },
      { type: "token_expired", reference_id: locId, created_at: hoursAgo(6) },
      { type: "payment_failed", reference_id: null, created_at: hoursAgo(8) },
    ].filter((f) => f.reference_id !== null || f.type === "payment_failed");
    const { error: iErr } = await db.from("notifications").insert(
      fixtures.map((f) => ({
        owner_id: ownerId,
        type: f.type,
        reference_id: f.reference_id,
        created_at: f.created_at,
        read_at: null,
      }))
    );
    if (iErr) throw new Error(iErr.message);

    const { error: pErr } = await db.from("payments").upsert(
      [
        {
          owner_id: ownerId,
          order_id: "fixture_order_paid_1",
          razorpay_payment_id: "pay_fixture_001",
          amount: 29900,
          currency: "INR",
          status: "captured",
          target_quantity: 1,
          failure_reason: null,
          created_at: "2026-09-18T10:30:00.000Z",
        },
        {
          owner_id: ownerId,
          order_id: "fixture_order_failed_1",
          razorpay_payment_id: "pay_fixture_002",
          amount: 29900,
          currency: "INR",
          status: "failed",
          target_quantity: 2,
          failure_reason: "Card declined (test fixture)",
          created_at: "2026-09-26T08:15:00.000Z",
        },
      ],
      { onConflict: "order_id,razorpay_payment_id", ignoreDuplicates: true }
    );
    if (pErr) throw new Error(pErr.message);
  }

  console.log(
    `E2E reset: ${ids.length} customer(s) submissions cleared, 4 notification fixtures rebuilt, billing fixtures ready.`
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
