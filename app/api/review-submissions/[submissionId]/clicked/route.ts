import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/customer";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** FR-31 funnel analytics: the customer clicked "Post on Google". */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ submissionId: string }> }
): Promise<NextResponse> {
  const customer = await requireCustomer();
  if (customer instanceof NextResponse) return customer;

  const { submissionId } = await ctx.params;
  if (!UUID_RE.test(submissionId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await db
    .from("review_submissions")
    .update({ clicked_google_post: true })
    .eq("id", submissionId)
    .eq("customer_id", customer.customerId)
    .select("id");
  if (error) {
    console.error("[submissions] clicked update failed:", error.message);
    return NextResponse.json({ error: "Could not record click." }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
