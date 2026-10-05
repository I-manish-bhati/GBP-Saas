import Link from "next/link";
import { notFound } from "next/navigation";
import { getOwnerDetail } from "@/lib/admin/queries";
import { SuspendButton } from "./suspend-button";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.replace("T", " ").slice(0, 16) + " UTC";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {children}
    </div>
  );
}

function Empty({ what }: { what: string }) {
  return (
    <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
      No {what} yet.
    </p>
  );
}

export default async function OwnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const detail = await getOwnerDetail(id);
  if (!detail) notFound();

  const { owner, subscription, locations, logs } = detail;
  const locName = (locationId: string | null): string =>
    locations.find((l) => l.id === locationId)?.name ?? (locationId ? "unknown" : "—");

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {owner.email}
            </h1>
            {owner.suspended_at ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                Suspended {fmt(owner.suspended_at)}
              </span>
            ) : (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                Active
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {owner.name ?? "No name"} · joined {fmt(owner.created_at)} · email{" "}
            {owner.email_verified ? "verified" : "unverified"} ·{" "}
            {locations.length} location{locations.length === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">Phone: {owner.phone ?? "—"}</p>
        </div>
        <div className="flex items-center gap-3">
          <SuspendButton ownerId={owner.id} suspended={Boolean(owner.suspended_at)} />
          <Link
            href="/admin"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Back
          </Link>
        </div>
      </div>

      <Section title="Subscription">
        {subscription ? (
          <Card>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-zinc-500">Status</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                  {subscription.status}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Plan</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                  {subscription.plan_id ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Quantity</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                  {subscription.quantity} {subscription.currency}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Current period end</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                  {fmt(subscription.current_period_end)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Razorpay subscription</dt>
                <dd className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {subscription.razorpay_subscription_id ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Created</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                  {fmt(subscription.created_at)}
                </dd>
              </div>
            </dl>
          </Card>
        ) : (
          <Empty what="subscription" />
        )}
      </Section>

      <Section title="Locations">
        {locations.length === 0 ? (
          <Empty what="locations" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Connection</th>
                  <th className="px-4 py-3 text-right">Reviews</th>
                  <th className="px-4 py-3 text-right">Posts</th>
                  <th className="px-4 py-3 text-right">Submissions</th>
                  <th className="px-4 py-3 text-right">Sync logs</th>
                  <th className="px-4 py-3 text-right">AI logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {locations.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {l.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {l.city ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {l.slug}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {l.connection_status}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {l.counts.reviews}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {l.counts.posts}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {l.counts.submissions}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {l.counts.syncLogs}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {l.counts.aiLogs}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Recent sync logs (FR-40)">
        {logs.syncLogs.length === 0 ? (
          <Empty what="sync logs" />
        ) : (
          <Card>
            <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
              {logs.syncLogs.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-4 py-2">
                  <span>
                    <span
                      className={
                        s.status === "success"
                          ? "font-medium text-green-700 dark:text-green-400"
                          : "font-medium text-red-700 dark:text-red-400"
                      }
                    >
                      {s.operation}
                    </span>{" "}
                    · {locName(s.location_id)}
                    {s.error_message ? (
                      <span className="block break-all text-xs text-zinc-500">
                        {s.error_message}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">{fmt(s.created_at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>

      <Section title="Recent AI generations">
        {logs.aiLogs.length === 0 ? (
          <Empty what="AI generations" />
        ) : (
          <Card>
            <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
              {logs.aiLogs.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-2">
                  <span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {a.type}
                    </span>{" "}
                    · {locName(a.location_id)}
                    {a.model_used ? (
                      <span className="text-zinc-500"> · {a.model_used}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">{fmt(a.created_at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>

      <Section title="Recent reviews">
        {logs.reviews.length === 0 ? (
          <Empty what="reviews" />
        ) : (
          <Card>
            <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
              {logs.reviews.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-2">
                  <span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </span>{" "}
                    {r.reviewer_name ?? "anonymous"} · {r.status} · {locName(r.location_id)}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">{fmt(r.fetched_at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>

      <Section title="Recent posts">
        {logs.posts.length === 0 ? (
          <Empty what="posts" />
        ) : (
          <Card>
            <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
              {logs.posts.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-4 py-2">
                  <span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {p.status}
                    </span>{" "}
                    · {locName(p.location_id)}
                    <span className="block max-w-xl truncate text-zinc-500">
                      {p.final_text ?? ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">{fmt(p.created_at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>

      <Section title="Recent QR review submissions">
        {logs.submissions.length === 0 ? (
          <Empty what="submissions" />
        ) : (
          <Card>
            <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
              {logs.submissions.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-4 py-2">
                  <span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {"★".repeat(s.rating)}
                      {"☆".repeat(5 - s.rating)}
                    </span>{" "}
                    · {locName(s.location_id)}
                    <span className="block max-w-xl truncate text-zinc-500">
                      {s.final_text}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">{fmt(s.created_at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>
    </div>
  );
}
