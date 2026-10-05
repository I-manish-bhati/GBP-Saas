import "server-only";
import { decryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { refreshTokenHandler } from "./refresh";

export const GBP_API_BASE = "https://businessbusiness.googleapis.com";

// sync_logs.operation constraint (0001_init.sql) — callers may only use these.
export type SyncOperation =
  | "fetch_reviews"
  | "publish_reply"
  | "publish_post"
  | "refresh_token"
  | "fetch_locations"
  | "generate_ai";

export interface GbpOk<T> {
  ok: true;
  data: T;
}
export interface GbpFail {
  ok: false;
  status: number;
  error: string;
}
export type GbpResult<T> = GbpOk<T> | GbpFail;

const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function logAttempt(
  locationId: string | null,
  op: SyncOperation,
  status: "success" | "failed",
  errorMessage?: string
): Promise<void> {
  if (!locationId) return;
  try {
    await db.from("sync_logs").insert({
      location_id: locationId,
      operation: op,
      status,
      error_message: errorMessage ? errorMessage.slice(0, 1000) : null,
    });
  } catch (e) {
    console.error("[gbp] sync_log insert failed:", e);
  }
}

async function getAccessToken(locationId: string): Promise<string | null> {
  const { data } = await db
    .from("locations")
    .select("access_token, token_expires_at")
    .eq("id", locationId)
    .limit(1);
  if (!data || data.length === 0 || !data[0].access_token) return null;

  const expiresAt = data[0].token_expires_at
    ? Date.parse(data[0].token_expires_at)
    : 0;
  if (expiresAt <= Date.now() + 2 * 60_000) {
    const fresh = await refreshTokenHandler(locationId);
    if (!fresh) return null;
    const again = await db
      .from("locations")
      .select("access_token")
      .eq("id", locationId)
      .limit(1);
    if (!again.data?.length) return null;
    return again.data[0].access_token
      ? decryptSecret(again.data[0].access_token)
      : null;
  }
  return decryptSecret(data[0].access_token);
}

/**
 * GBP API wrapper (tasks.md M4): Bearer-authenticated call against the
 * Business Information API with —
 *   401 → refresh once, retry once
 *   429 → backoff (Retry-After / exponential), up to 3 attempts total
 *   every attempt → sync_logs row (NFR-5)
 *
 * Never throws; failures come back as { ok: false }.
 */
export async function gbpFetch<T>(
  locationId: string,
  path: string,
  opts: { op: SyncOperation; query?: Record<string, string | undefined>; init?: RequestInit }
): Promise<GbpResult<T>> {
  const url = new URL(GBP_API_BASE + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, v);
  }

  let refreshed = false;
  let lastError = "unknown error";
  let lastStatus = 500;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let token: string | null = null;
    try {
      token = await getAccessToken(locationId);
    } catch (e) {
      // decrypt/refresh failure — treat like a missing token, never throw
      console.error("[gbp] getAccessToken threw:", e);
      token = null;
    }
    if (!token) {
      await logAttempt(locationId, opts.op, "failed", "no access token (refresh failed)");
      return { ok: false, status: 401, error: "Google access unavailable (token expired)" };
    }

    let res: Response;
    try {
      res = await fetch(url, {
        ...opts.init,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(opts.init?.headers ?? {}),
        },
      });
    } catch (e) {
      lastError = `network: ${e instanceof Error ? e.message : String(e)}`;
      lastStatus = 0;
      await logAttempt(locationId, opts.op, "failed", lastError);
      await sleep(500 * attempt);
      continue;
    }

    if (res.ok) {
      await logAttempt(locationId, opts.op, "success");
      let data: unknown;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      return { ok: true, data: data as T };
    }

    lastStatus = res.status;
    const bodyText = await res.text().catch(() => "");
    lastError = `HTTP ${res.status}: ${bodyText.slice(0, 400)}`;
    await logAttempt(locationId, opts.op, "failed", lastError);

    if (res.status === 401) {
      if (refreshed) return { ok: false, status: 401, error: lastError };
      refreshed = true;
      const fresh = await refreshTokenHandler(locationId);
      if (!fresh) {
        return { ok: false, status: 401, error: "token refresh failed" };
      }
      continue; // retry with the new token
    }

    if (res.status === 429 && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 15_000)
        : 1000 * 2 ** attempt;
      await sleep(backoff);
      continue;
    }

    return { ok: false, status: res.status, error: lastError };
  }

  return { ok: false, status: lastStatus, error: lastError };
}
