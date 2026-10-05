import "server-only";
import { db } from "@/lib/db";

/** Per-owner AI generation cap (M5 / D4) — shared across all AI routes. */
export const AI_DAILY_LIMIT = 100;

const WINDOW_MS = 24 * 60 * 60_000;

export interface AiUsage {
  used: number;
  limit: number;
}

/**
 * Counts ai_generation_logs rows for the owner's locations in the rolling
 * 24h window. Fail-open: a counting error logs and reports zero so
 * generation is never blocked by the meter itself.
 */
export async function aiDailyUsage(ownerId: string): Promise<AiUsage> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count, error } = await db
    .from("ai_generation_logs")
    .select("id, locations!inner(owner_id)", { count: "exact", head: true })
    .eq("locations.owner_id", ownerId)
    .gte("created_at", since);
  if (error) {
    console.error("[ai-cap] count query failed:", error.message);
    return { used: 0, limit: AI_DAILY_LIMIT };
  }
  return { used: count ?? 0, limit: AI_DAILY_LIMIT };
}

/**
 * DB-backed second layer for the AI cap: holds even when Upstash rate
 * limiting is bypassed (local dev / D4 pending) and doubles as a fail-safe
 * if the Redis limiter is unavailable.
 */
export async function aiDailyCapExceeded(ownerId: string): Promise<boolean> {
  const { used, limit } = await aiDailyUsage(ownerId);
  return used >= limit;
}
