import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listOwners } from "@/lib/admin/queries";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);

  try {
    const result = await listOwners({ search, page });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load owners" },
      { status: 500 }
    );
  }
}
