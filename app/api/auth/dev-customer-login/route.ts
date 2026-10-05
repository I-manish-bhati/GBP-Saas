import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { signSession } from "@/lib/auth/jwt";
import { setSessionToken } from "@/lib/auth/cookies";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()).optional(),
  name: z.string().trim().max(100).optional(),
});

/**
 * Dev-only customer login (M9 test hook): active ONLY when Client B is not
 * configured and NODE_ENV !== "production" — so the `/r/{slug}` flow can be
 * exercised in local browser tests without Google OAuth. Production builds
 * respond 404; configuring Client B disables it entirely.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.GOOGLE_CUSTOMER_OAUTH_CLIENT_ID
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const email = parsed.data.email ?? "dev@example.com";
  const name = parsed.data.name ?? "Dev Customer";

  const { data: rows, error } = await db
    .from("customers")
    .upsert(
      { google_sub: `dev:${email}`, email, name },
      { onConflict: "google_sub" }
    )
    .select("id, email, name");
  if (error || !rows || rows.length === 0) {
    console.error("[dev-customer-login] upsert failed:", error?.message);
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }

  const token = await signSession(rows[0].id, "customer");
  await setSessionToken("customer", token);
  return NextResponse.json({ ok: true, customer: rows[0] });
}
