"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client-api";

interface RazorpayHandlerResponse {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  name?: string;
  description?: string;
  theme?: { color?: string };
  handler?: (response: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
  on(event: string, callback: (response: unknown) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

function loadRazorpaySdk(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface CheckoutData {
  orderId: string;
  keyId: string;
  targetQuantity: number;
  priceInr: number;
}

/**
 * M8 billing hub (anchor `#billing`, target of every "upgrade" link).
 * FR-36: connecting Google locations is free; this buys AI slots at
 * ₹priceInr/location/month.
 */
export function BillingCard({
  status,
  quantity,
  locationCount,
  priceInr,
  configured,
}: {
  status: string | null;
  quantity: number | null;
  locationCount: number;
  priceInr: number;
  configured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const aiLocations = Math.min(locationCount, quantity ?? 0);
  const chipClass =
    status === "active"
      ? "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300"
      : status
        ? "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        : "rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  async function buySlot(): Promise<void> {
    setBusy(true);
    setMessage(null);
    const res = await postJson("/api/billing/checkout", {});
    if (!res.ok || !res.data) {
      setMessage(res.error ?? "Could not start checkout.");
      setBusy(false);
      return;
    }
    const { orderId, keyId, targetQuantity, priceInr: price } =
      res.data as unknown as CheckoutData;

    const sdkReady = await loadRazorpaySdk();
    if (!sdkReady) {
      setMessage("Could not load Razorpay checkout. Try again in a moment.");
      setBusy(false);
      return;
    }

    const RazorpayCtor = window.Razorpay;
    if (!RazorpayCtor) {
      setMessage("Razorpay checkout unavailable.");
      setBusy(false);
      return;
    }

    const rzp = new RazorpayCtor({
      key: keyId,
      order_id: orderId,
      name: "GBP Suite",
      description: `AI slot ${targetQuantity} — ₹${price}/location/month`,
      theme: { color: "#18181b" },
      handler: async (response) => {
        const confirm = await postJson("/api/billing/confirm", {
          order_id: response.razorpay_order_id,
          payment_id: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        });
        setBusy(false);
        if (confirm.ok) {
          setMessage("Payment received — AI slots updated.");
          router.refresh();
        } else {
          setMessage(
            (confirm.error ?? "Payment made, but confirmation failed.") +
              " It will settle automatically via webhook."
          );
          router.refresh();
        }
      },
      modal: {
        ondismiss: () => {
          setBusy(false);
          setMessage("Checkout cancelled — you were not charged.");
        },
      },
    });
    rzp.on("payment.failed", () => {
      setMessage("Payment failed. Please try again or use another card.");
    });
    rzp.open();
  }

  return (
    <section
      id="billing"
      className="mt-6 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Billing
          </span>
          <span className={chipClass}>
            {status === "active"
              ? "Subscription active"
              : status
                ? `Subscription ${status}`
                : "No subscription"}
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {aiLocations} of {locationCount}
            </span>{" "}
            locations have AI
          </span>
          <span className="text-xs text-zinc-500">
            ₹{priceInr}/location/month
          </span>
        </div>
        {configured ? (
          <button
            type="button"
            onClick={buySlot}
            disabled={busy}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {busy
              ? "Opening checkout…"
              : quantity
                ? `Buy another AI slot — ₹${priceInr}`
                : `Start AI — ₹${priceInr} for your first slot`}
          </button>
        ) : (
          <p className="text-xs text-zinc-500">
            Razorpay keys pending — add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to
            .env.local.
          </p>
        )}
      </div>
      {message ? (
        <p role="status" className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          {message}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-zinc-500">
        Connecting Google locations is free. AI features (review replies, post
        generation) unlock for the slots you pay for (FR-36).{" "}
        <Link href="/dashboard/billing" className="underline underline-offset-2">
          View billing details &amp; payment history →
        </Link>
      </p>
    </section>
  );
}
