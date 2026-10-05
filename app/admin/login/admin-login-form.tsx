"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AuthCard,
  FormError,
  buttonClass,
  inputClass,
} from "@/components/auth-card";
import { postJson } from "@/lib/client-api";

export function AdminLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const res = await postJson("/admin/api/auth/login", {
      email: fd.get("email"),
      password: fd.get("password"),
    });

    if (res.ok) {
      const safe = next && next.startsWith("/") && !next.startsWith("//");
      router.push(safe ? next : "/admin");
      return;
    }
    setError(res.error);
    setPending(false);
  }

  return (
    <AuthCard title="Admin sign in" subtitle="Internal access only.">
      <FormError message={error} />
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
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
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
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
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthCard>
  );
}
