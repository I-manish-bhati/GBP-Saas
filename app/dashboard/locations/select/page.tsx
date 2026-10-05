import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import {
  SelectLocationsForm,
  type SelectableLocation,
} from "./select-form";

export const dynamic = "force-dynamic";

export default async function SelectLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) redirect("/login?next=/dashboard");

  const sp = await searchParams;
  const state = typeof sp.state === "string" ? sp.state : "";
  if (!state) redirect("/dashboard?gbp_error=state%20missing");

  const { data: rows } = await db
    .from("oauth_sessions")
    .select("payload")
    .eq("state_hash", createHash("sha256").update(state).digest("hex"))
    .eq("owner_id", claims.sub)
    .gte("expires_at", new Date().toISOString())
    .not("payload", "is", null)
    .limit(1);

  const payload = rows?.[0]?.payload as
    | { locations?: SelectableLocation[] }
    | null
    | undefined;
  const locations = payload?.locations ?? [];
  if (locations.length === 0) {
    redirect("/dashboard?gbp_error=expired");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Choose locations to add
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        We found {locations.length} location
        {locations.length === 1 ? "" : "s"} under your Google account. Pick
        the ones you manage — each gets its own QR review link.
      </p>
      <div className="mt-6">
        <SelectLocationsForm state={state} locations={locations} />
      </div>
    </div>
  );
}
