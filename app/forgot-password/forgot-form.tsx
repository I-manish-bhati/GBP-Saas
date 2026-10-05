"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AuthCard,
  FormError,
  FormSuccess,
  buttonClass,
  inputClass,
} from "@/components/auth-card";
import { postJson } from "@/lib/client-api";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const res = await postJson("/api/auth/forgot-password", { email: fd.get("email") });
    setPending(false);

    // Server always says ok (no account enumeration) — same UI either way.
    if (res.ok) setSent(true);
    else setError(res.error);
  }

  return (
    <AuthCard
      title={sent ? "Check your email" : "Reset your password"}
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Back to sign in
          </Link>
        </>
      }
    >
      <FormError message={error} />
      {sent ? (
        <FormSuccess message="If an account exists for that email, we've sent a reset link. It's valid for 30 minutes." />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
