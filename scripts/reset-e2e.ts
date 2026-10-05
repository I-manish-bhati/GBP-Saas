/* Reset end-to-end test state before `npx playwright test`:
 *   npx tsx scripts/reset-e2e.ts
 * Clears FR-32 daily review_submissions for the e2e test customers and marks
 * all notifications unread (M10 bell-badge assertions). */
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

  const { error: nErr } = await db
    .from("notifications")
    .update({ read_at: null })
    .not("read_at", "is", null);
  if (nErr) throw new Error(nErr.message);

  // Billing-page history fixtures (paid + failed attempt for the owner account).
  const { data: owners, error: oErr } = await db
    .from("owners")
    .select("id")
    .eq("email", "test@example.com")
    .limit(1);
  if (oErr) throw new Error(oErr.message);
  const ownerId = owners?.[0]?.id;
  if (ownerId) {
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
    `E2E reset: ${ids.length} customer(s) submissions cleared, notifications unread, billing fixtures ready.`
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
