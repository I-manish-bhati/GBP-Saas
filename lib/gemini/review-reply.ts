import "server-only";
import { db } from "@/lib/db";
import { buildReviewReplyPrompt } from "./prompts/review-reply";

const GEMINI_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const DEFAULT_MODEL = "gemini-2.5-flash";

export type GenerateResult =
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
      type: "review_reply",
      prompt_used: opts.prompt,
      model_used: opts.model,
      raw_response: opts.raw.slice(0, 20_000),
    });
  } catch (e) {
    console.error("[gemini] ai_generation_logs insert failed:", e);
  }
}

/**
 * FR-14/FR-15: generate a review-reply draft, log EVERY call to
 * ai_generation_logs (prompt, model, raw response), save the draft on the
 * review row (`status='drafted'`). Never throws.
 */
export async function generateReviewReply(opts: {
  locationId: string;
  reviewId: string;
}): Promise<GenerateResult> {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const { data: locRows } = await db
      .from("locations")
      .select(
        "id, name, category, specialties, short_description, language"
      )
      .eq("id", opts.locationId)
      .limit(1);
    const { data: revRows } = await db
      .from("reviews")
      .select("id, rating, review_text, status")
      .eq("id", opts.reviewId)
      .limit(1);
    const loc = locRows?.[0];
    const review = revRows?.[0];
    if (!loc || !review) return { ok: false, error: "Review or location not found" };

    const prompt = buildReviewReplyPrompt({
      locationName: loc.name,
      category: loc.category,
      specialties: loc.specialties,
      shortDescription: loc.short_description,
      reviewText: review.review_text,
      rating: review.rating,
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
        error: "AI is not configured yet (missing GEMINI_API_KEY). You can still write the reply yourself.",
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
      return { ok: false, error: `AI request failed (${res.status}). Try again shortly.` };
    }

    let json: GeminiResponse;
    try {
      json = JSON.parse(bodyText) as GeminiResponse;
    } catch {
      await logGeneration({ locationId: loc.id, prompt, model, raw: bodyText });
      return { ok: false, error: "AI returned an unreadable response." };
    }

    const draft = (json.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim();

    await logGeneration({
      locationId: loc.id,
      prompt,
      model,
      raw: draft || bodyText,
    });

    if (!draft) {
      return { ok: false, error: "AI returned an empty draft. Try again." };
    }

    const { error: updErr } = await db
      .from("reviews")
      .update({
        ai_reply_draft: draft,
        status: review.status === "pending" ? "drafted" : review.status,
      })
      .eq("id", opts.reviewId);
    if (updErr) {
      return { ok: false, error: `Could not save draft: ${updErr.message}` };
    }

    return { ok: true, draft };
  } catch (e) {
    console.error("[gemini] generate failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "AI generation failed." };
  }
}
