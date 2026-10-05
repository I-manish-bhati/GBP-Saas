import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwner, isAuthResponse } from "@/lib/auth/guards";
import { generateSlug } from "@/lib/slug";

export const runtime = "nodejs";

const schema = z.object({
  state: z.string().min(10).max(128),
  selected: z.array(z.string().min(1).max(300)).min(1).max(50),
});

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

function mapLanguage(code: string | null | undefined): string {
  if (!code) return "english";
  const c = code.toLowerCase();
  if (c.startsWith("hi")) return "hindi";
  if (c === "hinglish") return "hinglish";
  return "english";
}

/**
 * FR-8: "Add selected" — creates one `locations` row per chosen GBP
 * location. Tokens from the exchange are encrypted at rest (AES-256-GCM),
 * slug gets a crypto suffix (D8), and an already-added
 * google_location_id is skipped idempotently (NFR-4).
 */
export async function POST(req: Request) {
  const guard = await requireOwner({ requireVerified: true });
  if (isAuthResponse(guard)) return guard;
  const { ownerId } = guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { state, selected } = parsed.data;

  const { data: sessions } = await db
    .from("oauth_sessions")
    .delete()
    .eq("state_hash", createHash("sha256").update(state).digest("hex"))
    .eq("owner_id", ownerId)
    .gte("expires_at", new Date().toISOString())
    .not("payload", "is", null)
    .select();

  const session = sessions?.[0];
  if (!session || !session.payload) {
    return NextResponse.json(
      { error: "Selection session expired. Connect Google again." },
      { status: 410 }
    );
  }
  const payload = session.payload as SessionPayload;
  const chosen = payload.locations.filter((l) => selected.includes(l.resourceName));
  if (chosen.length === 0) {
    return NextResponse.json({ error: "No valid locations selected." }, { status: 400 });
  }

  const { data: existingRows } = await db
    .from("locations")
    .select("google_location_id")
    .eq("owner_id", ownerId);

  const alreadyAdded = new Set((existingRows ?? []).map((r) => r.google_location_id));

  const added: Array<{ id: string; name: string; slug: string }> = [];
  let skipped = 0;

  for (const loc of chosen) {
    if (alreadyAdded.has(loc.resourceName)) {
      skipped += 1;
      continue;
    }
    const slug = await generateSlug(loc.name);
    const { data: inserted, error } = await db
      .from("locations")
      .insert({
        owner_id: ownerId,
        google_location_id: loc.resourceName,
        name: loc.name,
        category: loc.categoryId,
        google_place_id: loc.placeId,
        language: mapLanguage(loc.languageCode),
        slug,
        access_token: payload.tokens.access_token,
        refresh_token: payload.tokens.refresh_token,
        token_expires_at: payload.tokens.expires_at,
        connection_status: "connected",
      })
      .select("id, name, slug")
      .limit(1);

    if (error) {
      // Unique violation on google_location_id → someone re-added it (NFR-4).
      if (error.code === "23505") {
        skipped += 1;
        continue;
      }
      console.error("[locations/bulk] insert failed:", error.message);
      continue;
    }
    if (inserted && inserted.length > 0) {
      alreadyAdded.add(loc.resourceName);
      added.push(inserted[0]);
    }
  }

  if (added.length === 0) {
    return NextResponse.json(
      {
        error: "All selected locations were already added.",
        added: [],
        skipped,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, added, skipped });
}
