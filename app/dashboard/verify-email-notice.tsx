"use client";

import { useState } from "react";
import { postJson } from "@/lib/client-api";

export function VerifyEmailNotice({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resend(): Promise<void> {
    setBusy(true);
    setMessage(null);
    const res = await postJson("/api/auth/resend-verification", { email });
    setBusy(false);
    setMessage(res.ok ? "Verification email sent — check your inbox." : res.error);
  }

  return (
    <div
      role="status"
      className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
    >
      <p className="font-medium">Verify your email to unlock Google connect, AI, and billing.</p>
      <p className="mt-0.5 text-xs">
        We sent a link to <span className="font-mono">{email}</span>.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="min-h-10 rounded-lg bg-amber-900 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-100 dark:text-amber-900"
        >
          {busy ? "Sending…" : "Resend email"}
        </button>
        {message ? <span className="text-xs">{message}</span> : null}
      </div>
    </div>
  );
}
