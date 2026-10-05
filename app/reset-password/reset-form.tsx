"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AuthCard,
  FormError,
  buttonClass,
  inputClass,
} from "@/components/auth-card";
import { postJson } from "@/lib/client-api";

export function ResetPasswordForm({ token, error: linkError }: { token: string | null; error: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(linkError);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const res = await postJson("/api/auth/reset-password", { token, password });
    if (res.ok) {
      router.push("/login?reset=1");
      return;
    }
    setError(res.error);
    setPending(false);
  }

  return (
    <AuthCard
      title="Set a new password"
      footer={
        <>
          <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Back to sign in
          </Link>
        </>
      }
    >
      <FormError message={error} />
      {token ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              New password
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
              Confirm new password
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
            {pending ? "Updating…" : "Update password"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-zinc-500">
          <Link href="/forgot-password" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Request a new reset link
          </Link>
        </p>
      )}
    </AuthCard>
  );
}
