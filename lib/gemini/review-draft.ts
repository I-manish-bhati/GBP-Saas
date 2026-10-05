import "server-only";
import { db } from "@/lib/db";
import { buildReviewDraftPrompt } from "./prompts/review-draft";

const GEMINI_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const DEFAULT_MODEL = "gemini-2.5-flash";

export type DraftResult =
  | { ok: true; draft: string }
  | { ok: false; error: string };

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

async function logGeneration(opts: {
  locationId: string;
  prompt: string;
  model: string;
  raw: string;
}): Promise<void> {
  try {
    await db.from("ai_generation_logs").insert({
      location_id: opts.locationId,
      type: "review_draft",
      prompt_used: opts.prompt,
      model_used: opts.model,
      raw_response: opts.raw.slice(0, 20_000),
    });
  } catch (e) {
    console.error("[gemini] ai_generation_logs insert failed:", e);
  }
}

/**
 * M9/FR-28: customer-facing review draft (type='review_draft'). Returns the
 * text only — persistence happens in POST /api/review-submissions so the
 * customer can always edit first (FR-30). Never throws.
 */
export async function generateReviewDraft(opts: {
  locationId: string;
  rating: number;
  tags: string[];
}): Promise<DraftResult> {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const { data: locRows } = await db
      .from("locations")
      .select("id, name, category, city, language")
      .eq("id", opts.locationId)
      .limit(1);
    const loc = locRows?.[0];
    if (!loc) return { ok: false, error: "Location not found." };
    if (opts.rating < 1 || opts.rating > 5) {
      return { ok: false, error: "Please choose a rating first." };
    }

    const prompt = buildReviewDraftPrompt({
      locationName: loc.name,
      category: loc.category ?? null,
      city: loc.city ?? null,
      rating: opts.rating,
      tags: opts.tags.slice(0, 10),
      language: (loc.language as "hindi" | "hinglish" | "english") ?? "english",
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await logGeneration({
        locationId: loc.id,
        prompt,
        model,
        raw: "ERROR: GEMINI_API_KEY not configured",
      });
      return {
        ok: false,
        error: "AI drafts are unavailable right now — you can still write your review yourself.",
      };
    }

    const res = await fetch(GEMINI_ENDPOINT(model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    });

    const bodyText = await res.text();
    if (!res.ok) {
      await logGeneration({
        locationId: loc.id,
        prompt,
        model,
        raw: `HTTP ${res.status}: ${bodyText}`,
      });
      return { ok: false, error: "AI draft failed. Try again, or write your own." };
    }

    let json: GeminiResponse;
    try {
      json = JSON.parse(bodyText) as GeminiResponse;
    } catch {
      await logGeneration({ locationId: loc.id, prompt, model, raw: bodyText });
      return { ok: false, error: "AI draft failed. Write your own review." };
    }

    const draft = (json.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim()
      .slice(0, 4096);

    await logGeneration({
      locationId: loc.id,
      prompt,
      model,
      raw: draft || bodyText,
    });

    if (!draft) {
      return { ok: false, error: "AI returned an empty draft. Write your own review." };
    }
    return { ok: true, draft };
  } catch (e) {
    console.error("[gemini] review draft failed:", e);
    return { ok: false, error: "AI draft failed. Write your own review." };
  }
}
