import Link from "next/link";
import { listOwners, OWNERS_PAGE_SIZE } from "@/lib/admin/queries";
import { inputClass } from "@/components/auth-card";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export default async function AdminOwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const search = typeof sp.search === "string" ? sp.search : "";
  const pageNum = Math.max(
    1,
    Number(typeof sp.page === "string" ? sp.page : "1") || 1
  );

  const { owners, total, page } = await listOwners({ search, page: pageNum });
  const totalPages = Math.max(1, Math.ceil(total / OWNERS_PAGE_SIZE));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Owners{" "}
          <span className="text-sm font-normal text-zinc-500">({total})</span>
        </h1>
        <form method="GET" action="/admin" className="flex gap-2">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search email or name…"
            className={`${inputClass} !w-64 !py-2 text-sm`}
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Search
          </button>
        </form>
      </div>

      {owners.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          No owners found{search ? ` for “${search}”` : ""}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Signed up</th>
                <th className="px-4 py-3 text-right">Locations</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {owners.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {o.email}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {o.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {fmtDate(o.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                    {o.locationCount}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {o.subscription
                      ? `${o.subscription.status}${o.subscription.plan_id ? ` · ${o.subscription.plan_id}` : ""}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {o.suspended_at ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                        Suspended
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/owners/${o.id}`}
                      className="text-sm font-medium text-zinc-900 underline hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <span className="flex gap-3">
            {page > 1 ? (
              <Link
                href={`/admin?${new URLSearchParams({ ...(search ? { search } : {}), page: String(page - 1) })}`}
                className="underline"
              >
                ← Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/admin?${new URLSearchParams({ ...(search ? { search } : {}), page: String(page + 1) })}`}
                className="underline"
              >
                Next →
              </Link>
            ) : null}
          </span>
        </nav>
      ) : null}
    </div>
  );
}
