import { NextResponse } from "next/server";
import { clearSessionToken } from "@/lib/auth/cookies";

export const runtime = "nodejs";

export async function POST() {
  await clearSessionToken("owner");
  return NextResponse.json({ ok: true });
}
