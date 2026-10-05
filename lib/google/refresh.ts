import "server-only";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const EXPIRY_MARGIN_MS = 5 * 60_000;

async function syncLog(
  locationId: string,
  status: "success" | "failed",
  errorMessage?: string
): Promise<void> {
  try {
    await db.from("sync_logs").insert({
      location_id: locationId,
      operation: "refresh_token",
      status,
      error_message: errorMessage ?? null,
    });
  } catch (e) {
    console.error("[refresh] sync_log insert failed:", e);
  }
}

async function markTokenExpired(
  locationId: string,
  ownerId: string,
  reason: string
): Promise<void> {
  await db
    .from("locations")
    .update({ connection_status: "token_expired" })
    .eq("id", locationId);
  await syncLog(locationId, "failed", reason);
  await notify(ownerId, "token_expired", locationId);
}

/**
 * FR-9/FR-10: refresh a location's Google tokens if they are expired or
 * about to expire (5 min margin). Idempotent — no-op when still fresh.
 *
 * Isolation (NFR-6): NEVER throws. Returns true only when the location ends
 * up with a usable, fresh-enough access token. Refresh failure or revocation
 * → connection_status='token_expired' + notification + sync_logs failure.
 */
export async function refreshTokenHandler(locationId: string): Promise<boolean> {
  try {
    const { data, error } = await db
      .from("locations")
      .select("id, owner_id, access_token, refresh_token, token_expires_at, connection_status")
      .eq("id", locationId)
      .limit(1);
    if (error || !data || data.length === 0) return false;
    const loc = data[0];

    const expiresAt = loc.token_expires_at ? Date.parse(loc.token_expires_at) : 0;
    if (expiresAt > Date.now() + EXPIRY_MARGIN_MS) return true; // still fresh

    if (!loc.refresh_token) {
      await markTokenExpired(locationId, loc.owner_id, "no refresh token stored");
      return false;
    }

    const clientId = process.env.GOOGLE_OWNER_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OWNER_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      await markTokenExpired(locationId, loc.owner_id, "Google OAuth client not configured");
      return false;
    }

    let refreshToken: string;
    try {
      refreshToken = decryptSecret(loc.refresh_token);
    } catch {
      await markTokenExpired(locationId, loc.owner_id, "refresh token decrypt failed");
      return false;
    }

    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      await markTokenExpired(
        locationId,
        loc.owner_id,
        `token endpoint ${res.status}: ${body.slice(0, 300)}`
      );
      return false;
    }

    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) {
      await markTokenExpired(locationId, loc.owner_id, "no access_token in refresh response");
      return false;
    }

    const newExpiry = new Date(Date.now() + (json.expires_in ?? 3000) * 1000).toISOString();
    const { error: updErr } = await db
      .from("locations")
      .update({
        access_token: encryptSecret(json.access_token),
        // Google may rotate the refresh token; keep the old one otherwise.
        ...(json.refresh_token ? { refresh_token: encryptSecret(json.refresh_token) } : {}),
        token_expires_at: newExpiry,
        connection_status: "connected",
      })
      .eq("id", locationId);
    if (updErr) {
      await syncLog(locationId, "failed", `db update: ${updErr.message}`);
      return false;
    }

    await syncLog(locationId, "success");
    return true;
  } catch (e) {
    // NFR-6: swallow everything — a broken location must not crash a loop.
    console.error("[refresh] unexpected error:", e);
    try {
      await syncLog(locationId, "failed", e instanceof Error ? e.message : String(e));
    } catch {
      /* even logging failed; stay quiet */
    }
    return false;
  }
}
