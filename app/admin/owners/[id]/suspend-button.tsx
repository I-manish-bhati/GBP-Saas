"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client-api";

export function SuspendButton({
  ownerId,
  suspended,
}: {
  ownerId: string;
  suspended: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function act() {
    let reason: string | undefined;
    if (suspended) {
      if (!window.confirm("Reactivate this owner?")) return;
    } else {
      const answer = window.prompt(
        "Suspend this owner? They will be blocked from logging in. (Optional reason)"
      );
      if (answer === null) return;
      reason = answer || undefined;
    }
    setPending(true);
    const res = suspended
      ? await postJson(`/admin/api/owners/${ownerId}/resume`, {})
      : await postJson(`/admin/api/owners/${ownerId}/suspend`, { reason });
    setPending(false);
    if (res.ok) {
      router.refresh();
    } else {
      window.alert(res.error);
    }
  }

  return (
    <button
      type="button"
      onClick={act}
      disabled={pending}
      className={
        suspended
          ? "rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          : "rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      }
    >
      {pending ? "Working…" : suspended ? "Reactivate owner" : "Suspend owner"}
    </button>
  );
}
