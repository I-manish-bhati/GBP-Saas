import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { razorpayConfigured, slotPriceInr } from "@/lib/razorpay";
import { effectiveQuantity } from "@/lib/billing/slots";
import { BillingCard } from "../billing-card";

export const dynamic = "force-dynamic";

interface PaymentRow {
  order_id: string;
  razorpay_payment_id: string;
  amount: number;
  currency: string;
  status: "captured" | "failed";
  target_quantity: number | null;
  failure_reason: string | null;
  created_at: string;
}

function statusChip(status: string | null): { label: string; cls: string } {
  if (status === "active")
    return {
      label: "Active",
      cls: "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300",
    };
  if (status === "past_due")
    return {
      label: "Past due",
      cls: "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    };
  if (status === "cancelled")
    return {
      label: "Cancelled",
      cls: "rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300",
    };
  return {
    label: "No subscription",
    cls: "rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  };
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {value}
      </div>
    </div>
  );
}

export default async function BillingPage(): Promise<React.ReactNode> {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) redirect("/login?next=/dashboard/billing");

  const [{ data: subRows }, { count: locationCount }, { data: paymentRows }] =
    await Promise.all([
      db
        .from("subscriptions")
        .select(
          "status, quantity, pending_quantity, current_period_end, currency, created_at"
        )
        .eq("owner_id", claims.sub)
        .limit(1),
      db
        .from("locations")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", claims.sub),
      db
        .from("payments")
        .select(
          "order_id, razorpay_payment_id, amount, currency, status, target_quantity, failure_reason, created_at"
        )
        .eq("owner_id", claims.sub)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const sub = subRows && subRows.length > 0 ? subRows[0] : null;
  const payments = (paymentRows ?? []) as PaymentRow[];
  const price = slotPriceInr();
  const chip = statusChip(sub?.status ?? null);
  const slots = effectiveQuantity(
    sub as { quantity: number; pending_quantity: number | null; current_period_end: string | null } | null
  );
  const locations = locationCount ?? 0;
  const aiLocations = Math.min(locations, sub?.quantity ?? 0);
  const renews = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Billing
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Subscription, AI slots and payment history.
          </p>
        </div>
        <span className={chip.cls}>{chip.label}</span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Detail
          label="Plan"
          value={
            <>
              AI slots — ₹{price}
              <span className="font-normal text-zinc-500">/location/month</span>
            </>
          }
        />
        <Detail
          label="AI slots"
          value={
            <>
              {slots} slot{slots === 1 ? "" : "s"}
              <span className="font-normal text-zinc-500">
                {" "}
                · {aiLocations} of {locations} locations with AI
              </span>
            </>
          }
        />
        <Detail
          label="Renews"
          value={renews ?? <span className="text-zinc-400">—</span>}
        />
        <Detail
          label="Billing since"
          value={
            sub?.created_at
              ? new Date(sub.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"
          }
        />
      </div>

      {sub?.pending_quantity != null ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          A slot reduction to {sub.pending_quantity} takes effect at the end of
          the current period — no partial refund (removal policy).
        </p>
      ) : null}

      <div className="mt-6">
        <BillingCard
          status={sub?.status ?? null}
          quantity={sub?.quantity ?? null}
          locationCount={locations}
          priceInr={price}
          configured={razorpayConfigured()}
        />
      </div>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Payment history
          </h2>
          <p className="text-xs text-zinc-500">
            {payments.length} record{payments.length === 1 ? "" : "s"} ·
            processed securely by Razorpay
          </p>
        </div>

        {payments.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No payments yet — your receipts will appear here after your first
            payment.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={`${p.order_id}-${p.razorpay_payment_id}`}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                  >
                    <td className="whitespace-nowrap py-3 pr-4 text-zinc-700 dark:text-zinc-300">
                      {new Date(p.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 pr-4 text-zinc-800 dark:text-zinc-200">
                      {p.target_quantity
                        ? `AI slot ${p.target_quantity}`
                        : "Slot payment"}
                      {p.status === "failed" && p.failure_reason ? (
                        <span className="block text-xs text-red-600 dark:text-red-400">
                          {p.failure_reason}
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-zinc-900 dark:text-zinc-100">
                      ₹{(p.amount / 100).toLocaleString("en-IN")}
                      <span className="ml-1 text-xs text-zinc-400">
                        {p.currency}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4">
                      {p.status === "captured" ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                          Paid
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-3 font-mono text-xs text-zinc-500">
                      {p.razorpay_payment_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          How billing works
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            Connecting Google Business Profiles and collecting QR reviews is
            always free.
          </li>
          <li>
            AI features (review replies, post generation, QR drafts) cost ₹
            {price}/location/month per paid slot.
          </li>
          <li>
            Failed payment attempts are listed above and retry anytime from the
            checkout button — you&apos;re only charged on success.
          </li>
          <li>
            Questions about an invoice? Contact{" "}
            <a
              href="mailto:support@gbpsuite.example"
              className="underline underline-offset-2"
            >
              support@gbpsuite.example
            </a>{" "}
            with the reference ID from the table.
          </li>
        </ul>
        <p className="mt-3">
          <Link href="/dashboard" className="underline underline-offset-2">
            ← Back to dashboard
          </Link>
        </p>
      </section>
    </div>
  );
}
