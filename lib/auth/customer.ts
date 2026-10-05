import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/jwt";
import { db } from "@/lib/db";

/** Customer identity guard for QR-flow APIs (separate cookie/JWT, FR-43). */
export async function requireCustomer(): Promise<
  { customerId: string } | NextResponse
> {
  const token = await getSessionToken("customer");
  const claims = token ? await verifySession(token, "customer") : null;
  if (!claims) {
    return NextResponse.json(
      { error: "Please sign in with Google to continue.", code: "CUSTOMER_AUTH" },
      { status: 401 }
    );
  }
  const { data } = await db
    .from("customers")
    .select("id")
    .eq("id", claims.sub)
    .limit(1);
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Please sign in with Google to continue.", code: "CUSTOMER_AUTH" },
      { status: 401 }
    );
  }
  return { customerId: claims.sub };
}
