import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { DashboardChrome } from "./chrome";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const token = await getSessionToken("owner");
  const claims = token ? await verifySession(token, "owner") : null;
  if (!claims) redirect("/login?next=/dashboard");

  const [{ data: ownerRows }, { data: locationRows }] = await Promise.all([
    db.from("owners").select("email, name").eq("id", claims.sub).limit(1),
    db
      .from("locations")
      .select("id, name")
      .eq("owner_id", claims.sub)
      .order("created_at", { ascending: true }),
  ]);

  const email = ownerRows?.[0]?.email ?? "";
  const name = (ownerRows?.[0]?.name as string | null) ?? "";
  const locations = (locationRows ?? []) as { id: string; name: string }[];

  const jar = await cookies();
  const cookieLoc = jar.get("dash_loc")?.value ?? null;
  const owned = new Set(locations.map((l) => l.id));
  const selectedId =
    cookieLoc && owned.has(cookieLoc) ? (cookieLoc as string) : null;

  return (
    <DashboardChrome
      locations={locations}
      selectedId={selectedId}
      email={email}
      name={name}
    >
      {children}
    </DashboardChrome>
  );
}
