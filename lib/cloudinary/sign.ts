import "server-only";
import crypto from "node:crypto";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

/**
 * Cloudinary signature: SHA1 of alphabetically sorted `key=value&` pairs
 * concatenated with the API secret.
 */
export function signParams(
  params: Record<string, string | number>,
  apiSecret: string
): string {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(canonical + apiSecret).digest("hex");
}

export interface UploadTicket {
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

/** Server-issued signature for a browser-direct upload (file never hits Next). */
export function issueUploadTicket(locationId: string): UploadTicket | null {
  const cfg = getCloudinaryConfig();
  if (!cfg) return null;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `gbp-saas/${locationId}`;
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
    cloudName: cfg.cloudName,
    apiKey: cfg.apiKey,
    timestamp,
    signature: signParams({ folder, timestamp }, cfg.apiSecret),
    folder,
  };
}

/**
 * API-side destroy (allowed: only *uploads* must bypass the Next server).
 * Best-effort — Cloudinary cleanup failure must not block DB deletion.
 */
export async function destroyImage(
  publicId: string
): Promise<{ ok: boolean; error?: string }> {
  const cfg = getCloudinaryConfig();
  if (!cfg) return { ok: false, error: "Cloudinary not configured" };
  const timestamp = Math.floor(Date.now() / 1000);
  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/destroy`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_id: publicId,
          api_key: cfg.apiKey,
          timestamp,
          signature: signParams({ public_id: publicId, timestamp }, cfg.apiSecret),
        }),
      }
    );
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
