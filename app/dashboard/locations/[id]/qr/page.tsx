import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { QrSettingsForm } from "./qr-settings-form";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PRINT_GUIDANCE = [
  "Print at 5 × 5 cm (2 in) or larger — bigger scans faster.",
  "Keep the quiet zone (the white border around the code) intact.",
  "Never recolor the QR modules — dark-on-light only, high contrast.",
  "Don't stretch or rotate the code; test-scan your printed copy.",
];

export default async function LocationQrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) notFound();

  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { data: locRows } = await db
    .from("locations")
    .select("id, owner_id, name, city, slug, qr_template, brand_color, tagline, updated_at")
    .eq("id", id)
    .limit(1);
  const loc = locRows?.[0];
  if (!loc || loc.owner_id !== claims.sub) notFound();

  const previewSrc = `/api/locations/${loc.id}/qr?format=svg&v=${Date.parse(loc.updated_at) || 0}`;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {loc.name}
          </h1>
          <p className="text-sm text-zinc-500">
            {loc.city ?? "—"} · QR link <span className="font-mono">/r/{loc.slug}</span>
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Preview
          </h2>
          <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt={`QR code poster for ${loc.name}`}
              className="mx-auto w-full max-w-[300px] rounded"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`/api/locations/${loc.id}/qr?format=svg&disposition=attachment`}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Download SVG (print)
            </a>
            <a
              href={`/api/locations/${loc.id}/qr?format=png&disposition=attachment`}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Download PNG (2x)
            </a>
            <a
              href={`/r/${loc.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Open customer page ↗
            </a>
          </div>
          <ul className="mt-4 space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <li className="font-semibold">Print guidance</li>
            {PRINT_GUIDANCE.map((g) => (
              <li key={g}>• {g}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            QR settings
          </h2>
          <QrSettingsForm
            locationId={loc.id}
            initial={{
              qr_template: loc.qr_template ?? "minimal",
              brand_color: loc.brand_color ?? "#18181b",
              tagline: loc.tagline ?? "",
            }}
          />
        </section>
      </div>
    </div>
  );
}
