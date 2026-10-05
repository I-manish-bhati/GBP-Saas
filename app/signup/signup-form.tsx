"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AuthCard,
  FormError,
  buttonClass,
  inputClass,
} from "@/components/auth-card";
import { postJson } from "@/lib/client-api";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const res = await postJson("/api/auth/signup", {
      email,
      password,
      name: String(fd.get("name") ?? "") || undefined,
    });
    setPending(false);

    if (res.ok) {
      setSentTo(email);
      return;
    }
    setError(res.error);
  }

  async function resend() {
    if (!sentTo || resendState !== "idle") return;
    setResendState("sending");
    const res = await postJson("/api/auth/resend-verification", { email: sentTo });
    setResendState(res.ok ? "sent" : "idle");
    if (!res.ok) setError(res.error);
  }

  if (sentTo) {
    return (
      <AuthCard
        title="Check your email"
        footer={
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
              Sign in
            </Link>
          </>
        }
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          We sent a verification link to <span className="font-medium">{sentTo}</span>. Open it to
          activate your account.
        </p>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Didn&apos;t get it?{" "}
          <button
            type="button"
            onClick={resend}
            disabled={resendState !== "idle"}
            className="font-medium text-zinc-900 underline disabled:opacity-50 dark:text-zinc-100"
          >
            {resendState === "sending" ? "Sending…" : resendState === "sent" ? "Sent again" : "Resend"}
          </button>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Free to sign up — connect a location, pay when you're ready for AI features."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Sign in
          </Link>
        </>
      }
    >
      <FormError message={error} />
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Name <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input id="name" name="name" type="text" autoComplete="name" className={inputClass} />
        </div>
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
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-500">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Confirm password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
          />
        </div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
