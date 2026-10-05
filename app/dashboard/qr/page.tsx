import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { CopyQrButton } from "../copy-qr";

export const dynamic = "force-dynamic";

const PRINT_GUIDANCE = [
  "Print at 5 × 5 cm (2 in) or larger — bigger scans faster.",
  "Keep the quiet zone (the white border around the code) intact.",
  "Never recolor the QR modules — dark-on-light only, high contrast.",
  "Don't stretch or rotate the code; test-scan your printed copy.",
];

interface QrCardLocation {
  id: string;
  name: string;
  city: string | null;
  slug: string;
  updated_at: string;
}

/**
 * All-locations QR index (multi-location owners): one card per location with
 * its preview + downloads. Template/brand settings stay on the location's QR
 * page ("Customize").
 */
export default async function QrIndexPage() {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) {
    // the dashboard layout already guards the session; this keeps the
    // page safe if rendered outside it
    return null;
  }

  const { data: locRows } = await db
    .from("locations")
    .select("id, name, city, slug, updated_at")
    .eq("owner_id", claims.sub)
    .order("created_at", { ascending: true });
  const locations = (locRows ?? []) as QrCardLocation[];

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          QR codes
        </h1>
        <p className="text-sm text-zinc-500">
          All locations · {locations.length}{" "}
          {locations.length === 1 ? "location" : "locations"}
        </p>
      </div>

      {locations.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No locations yet. Connect your Google Business Profile to import them.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {locations.map((loc) => {
            const previewSrc = `/api/locations/${loc.id}/qr?format=svg&v=${
              Date.parse(loc.updated_at) || 0
            }`;
            return (
              <section
                key={loc.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {loc.name}
                    </h2>
                    <p className="text-xs text-zinc-500">
                      {loc.city ?? "—"} ·{" "}
                      <span className="font-mono">/r/{loc.slug}</span>
                    </p>
                  </div>
                  <CopyQrButton slug={loc.slug} />
                </div>
                <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSrc}
                    alt={`QR code poster for ${loc.name}`}
                    className="mx-auto w-full max-w-[220px] rounded"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`/api/locations/${loc.id}/qr?format=svg&disposition=attachment`}
                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                  >
                    Download SVG
                  </a>
                  <a
                    href={`/api/locations/${loc.id}/qr?format=png&disposition=attachment`}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Download PNG
                  </a>
                  <a
                    href={`/r/${loc.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Open customer page ↗
                  </a>
                  <a
                    href={`/dashboard/locations/${loc.id}/qr`}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Customize
                  </a>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ul className="mt-6 space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <li className="font-semibold">Print guidance</li>
        {PRINT_GUIDANCE.map((g) => (
          <li key={g}>• {g}</li>
        ))}
      </ul>
    </div>
  );
}
