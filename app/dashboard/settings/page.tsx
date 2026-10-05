import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { aiDailyUsage } from "@/lib/gemini/cap";
import { getNotificationPrefs } from "@/lib/notify";
import { PasswordForm } from "./password-form";
import { ThemeToggle } from "./theme-toggle";
import { NotificationPrefs } from "./notification-prefs";
import { DangerZone } from "./danger-zone";

export const dynamic = "force-dynamic";

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800/80 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      {hint ? (
        <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>
      ) : null}
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) redirect("/login?next=/dashboard/settings");

  const [{ data: locationRows }, usage, prefs] = await Promise.all([
    db
      .from("locations")
      .select("id, name, connection_status")
      .eq("owner_id", claims.sub)
      .order("created_at", { ascending: true }),
    aiDailyUsage(claims.sub),
    getNotificationPrefs(claims.sub),
  ]);
  const locations = locationRows ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Settings
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Appearance, notifications, security, AI usage and connections.
      </p>

      <div className="mt-6 space-y-4">
        <SectionCard
          title="Appearance"
          hint="Stored per device; System follows your OS setting."
        >
          <ThemeToggle />
        </SectionCard>

        <SectionCard
          title="Notification preferences"
          hint="Controls the bell and optional email copies. Changes save immediately."
        >
          <NotificationPrefs initialPrefs={prefs} />
        </SectionCard>

        <SectionCard
          title="Change password"
          hint="At least 8 characters. You'll keep this session signed in."
        >
          <PasswordForm />
        </SectionCard>

        <SectionCard
          title="AI usage"
          hint="Rolling 24-hour window shared across replies, posts and QR drafts."
        >
          <div className="mt-3 flex items-center gap-3">
            <div
              className="h-2 w-40 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={usage.limit}
              aria-valuenow={usage.used}
              aria-label="AI usage today"
            >
              <div
                className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                style={{
                  width: `${Math.min(100, Math.round((usage.used / usage.limit) * 100))}%`,
                }}
              />
            </div>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {usage.used} / {usage.limit} generations
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Need more? Raise your AI slots from{" "}
            <Link href="/dashboard/billing" className="underline">
              Billing
            </Link>
            .
          </p>
        </SectionCard>

        <SectionCard
          title="Google connections"
          hint="Each location connects to its own Google Business Profile."
        >
          {locations.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No locations yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
              {locations.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span className="text-sm text-zinc-800 dark:text-zinc-200">
                    {l.name}
                  </span>
                  {l.connection_status === "connected" ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                      Connected
                    </span>
                  ) : (
                    <Link
                      href={`/api/auth/gbp/start?location_id=${l.id}`}
                      prefetch={false}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 hover:underline dark:bg-amber-950 dark:text-amber-300"
                    >
                      Reconnect
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Your data"
          hint="Export everything you've created, or permanently delete the account."
        >
          <DangerZone />
        </SectionCard>

        <SectionCard title="Legal">
          <div className="mt-2 flex gap-4 text-sm">
            <Link href="/privacy" className="underline underline-offset-2">
              Privacy Policy
            </Link>
            <Link href="/terms" className="underline underline-offset-2">
              Terms of Service
            </Link>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
