"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AuthCard,
  FormError,
  FormSuccess,
  buttonClass,
  inputClass,
} from "@/components/auth-card";
import { postJson, safeNextPath } from "@/lib/client-api";

const NOTICES: Record<string, { type: "success" | "error"; message: string }> = {
  verified: { type: "success", message: "Email verified — sign in to continue." },
  verify_error: {
    type: "error",
    message: "That verification link is invalid or expired. Request a new one after signing in.",
  },
  reset: { type: "success", message: "Password updated — sign in with your new password." },
};

export function LoginForm({
  next,
  notice,
}: {
  next?: string;
  notice?: "verified" | "verify_error" | "reset" | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(
    notice && NOTICES[notice].type === "error" ? NOTICES[notice].message : null
  );
  const [success, setSuccess] = useState<string | null>(
    notice && NOTICES[notice].type === "success" ? NOTICES[notice].message : null
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const fd = new FormData(e.currentTarget);
    const res = await postJson("/api/auth/login", {
      email: fd.get("email"),
      password: fd.get("password"),
    });

    if (res.ok) {
      router.push(safeNextPath(next));
      return;
    }
    setError(res.error);
    setPending(false);
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Manage your Google Business Profiles and QR reviews."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Create an account
          </Link>
        </>
      }
    >
      <FormError message={error} />
      <FormSuccess message={success} />
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
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </div>
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Forgot password?
          </Link>
        </div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthCard>
  );
}
