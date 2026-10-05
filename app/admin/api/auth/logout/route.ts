import { NextResponse } from "next/server";
import { clearSessionToken } from "@/lib/auth/cookies";

export const runtime = "nodejs";

export async function POST() {
  await clearSessionToken("admin");
  return NextResponse.json({ ok: true });
}
