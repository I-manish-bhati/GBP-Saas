import { NextResponse } from "next/server";
import type { RateLimitResult } from "@/lib/rate-limit";

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

export function rateLimitResponse(res: RateLimitResult): NextResponse {
  const retrySeconds = Math.ceil((res.retryAfterMs ?? 60_000) / 1000);
  return jsonError(429, "Too many attempts. Please try again later.", {
    retryAfterSeconds: retrySeconds,
  });
}
