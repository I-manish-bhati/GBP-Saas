import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const STATE_COOKIE = "gbp_oauth_state";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SELECT_TTL_SECONDS = 10 * 60;
const PAGE_SIZE = 100;

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

interface RawLocation {
  resourceName?: string;
  name?: string;
  placeId?: string;
  categoryId?: string;
  displayName?: { text?: string };
  languageCode?: string;
}

interface FlatLocation {
  resourceName: string;
  name: string;
  accountName: string;
  placeId: string | null;
  categoryId: string | null;
  languageCode: string | null;
}

interface SessionPayload {
  tokens: { access_token: string; refresh_token: string | null; expires_at: string };
  locations: FlatLocation[];
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

async function consumeSession(state: string) {
  const { data } = await db
    .from("oauth_sessions")
    .delete()
    .eq("state_hash", sha256Hex(state))
    .gte("expires_at", new Date().toISOString())
    .select();
  return data && data.length > 0 ? data[0] : null;
}

async function requeueSession(
  state: string,
  ownerId: string,
  reconnectLocationId: string | null,
  payload: SessionPayload
): Promise<void> {
  await db.from("oauth_sessions").insert({
    state_hash: sha256Hex(state),
    owner_id: ownerId,
    code_verifier: "",
    reconnect_location_id: reconnectLocationId,
    payload,
    expires_at: new Date(Date.now() + SELECT_TTL_SECONDS * 1000).toISOString(),
  });
}

function fail(req: Request, message: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/dashboard?gbp_error=${encodeURIComponent(message)}`, req.url)
  );
}

async function exchangeCode(body: Record<string, string>): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
} | null> {
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchAccountLocations(
  accessToken: string,
  accountId: string,
  accountName: string
): Promise<FlatLocation[]> {
  const out: FlatLocation[] = [];
  let pageToken: string | undefined;

  const masks = [
    "id,name,placeId,categoryId,displayName,languageCode",
    "id,name,categoryId,displayName",
    "id,name",
  ];

  do {
    let res: Response | null = null;
    for (const readMask of masks) {
      const url = new URL(
        `https://businessbusiness.googleapis.com/v1/accounts/${accountId}/locations`
      );
      url.searchParams.set("pageSize", String(PAGE_SIZE));
      url.searchParams.set("readMask", readMask);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) break;
      // Unknown field in readMask (Google changes these) → try a thinner mask.
      if (res.status !== 400) break;
      await res.text();
      res = null;
    }
    if (!res || !res.ok) {
      throw new Error(
        `locations fetch failed for account ${accountId}: ${res?.status ?? "network"}`
      );
    }
    const json = (await res.json()) as {
      locations?: RawLocation[];
      nextPageToken?: string;
    };
    for (const loc of json.locations ?? []) {
      if (!loc.resourceName) continue;
      out.push({
        resourceName: loc.resourceName,
        name: loc.displayName?.text || loc.name || loc.resourceName,
        accountName,
        placeId: loc.placeId ?? null,
        categoryId: loc.categoryId ?? null,
        languageCode: loc.languageCode ?? null,
      });
    }
    pageToken = json.nextPageToken;
  } while (pageToken);

  return out;
}

async function fetchAllLocations(accessToken: string): Promise<FlatLocation[]> {
  const locations: FlatLocation[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL("https://businessbusiness.googleapis.com/v1/accounts");
    url.searchParams.set("pageSize", String(PAGE_SIZE));
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`accounts fetch failed: ${res.status}`);
    const json = (await res.json()) as {
      accounts?: Array<{ name?: string; displayName?: string }>;
      nextPageToken?: string;
    };
    for (const account of json.accounts ?? []) {
      if (!account.name) continue;
      const accountLocations = await fetchAccountLocations(
        accessToken,
        account.name.replace(/^accounts\//, ""),
        account.displayName ?? account.name
      );
      locations.push(...accountLocations);
    }
    pageToken = json.nextPageToken;
  } while (pageToken);
  return locations;
}

/**
 * FR-7/FR-8: OAuth callback — verify state (single-use), exchange the code,
 * verify id_token (issuer + audience via Google's JWKS), fetch every GBP
 * location under the account (paginated), then either apply tokens in place
 * (reconnect) or hand the list to the selection UI.
 */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const state = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.set(STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/gbp",
    maxAge: 0,
  });
  if (!state) return fail(req, "state missing");

  const session = await consumeSession(state);
  if (!session) return fail(req, "state invalid or expired");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const googleError = url.searchParams.get("error");
  if (googleError) return fail(req, `google: ${googleError}`);
  if (!code) return fail(req, "code missing");

  const clientId = process.env.GOOGLE_OWNER_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OWNER_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail(req, "oauth client not configured");

  const tokens = await exchangeCode({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/gbp/callback`,
    grant_type: "authorization_code",
    code_verifier: session.code_verifier,
  });
  if (!tokens || !tokens.access_token) return fail(req, "token exchange failed");

  if (tokens.id_token) {
    try {
      await jwtVerify(tokens.id_token, JWKS, {
        issuer: "https://accounts.google.com",
        audience: clientId,
      });
    } catch (e) {
      console.error("[gbp/callback] id_token verify failed:", e);
      return fail(req, "id_token verification failed");
    }
  }

  let fetched: FlatLocation[];
  try {
    fetched = await fetchAllLocations(tokens.access_token);
  } catch (e) {
    console.error("[gbp/callback] location fetch failed:", e);
    return fail(req, "could not fetch GBP locations");
  }

  const payload: SessionPayload = {
    tokens: {
      access_token: encryptSecret(tokens.access_token),
      refresh_token: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : null,
      expires_at: new Date(
        Date.now() + (tokens.expires_in ?? 3000) * 1000
      ).toISOString(),
    },
    locations: fetched,
  };

  // Reconnect (FR-10): same google_location_id already known → update in place.
  const reconnectId = session.reconnect_location_id;
  if (reconnectId) {
    const { data: existing } = await db
      .from("locations")
      .select("id, google_location_id")
      .eq("id", reconnectId)
      .eq("owner_id", session.owner_id)
      .limit(1);
    const current = existing?.[0];
    const match =
      current &&
      fetched.find((l) => l.resourceName === current.google_location_id);
    if (current && match) {
      const { error: updErr } = await db
        .from("locations")
        .update({
          access_token: payload.tokens.access_token,
          refresh_token: payload.tokens.refresh_token,
          token_expires_at: payload.tokens.expires_at,
          connection_status: "connected",
        })
        .eq("id", reconnectId);
      if (!updErr) {
        return NextResponse.redirect(new URL("/dashboard?gbp=reconnected", req.url));
      }
      console.error("[gbp/callback] reconnect update failed:", updErr.message);
      return fail(req, "reconnect update failed");
    }
    // Location not in the fetched list → fall through to selection UI.
  }

  try {
    await requeueSession(state, session.owner_id, reconnectId, payload);
  } catch (e) {
    console.error("[gbp/callback] requeue failed:", e);
    return fail(req, "session error");
  }

  return NextResponse.redirect(
    new URL(`/dashboard/locations/select?state=${state}`, req.url)
  );
}
