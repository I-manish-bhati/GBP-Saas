import type { ReactNode } from "react";
import Link from "next/link";
import { AdminBar } from "./admin-bar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              GBP Suite · Admin
            </span>
            <Link
              href="/admin"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Owners
            </Link>
          </div>
          <AdminBar />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
