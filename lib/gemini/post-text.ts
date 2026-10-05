import "server-only";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { buildPostPrompt } from "./prompts/posts";

const GEMINI_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const DEFAULT_MODEL = "gemini-2.5-flash";

const AUTO_PUBLISH_DELAY_MS = 2 * 60 * 60 * 1000; // FR-18: now + 2h

export type GeneratePostResult =
  | { ok: true; postId: string; text: string }
  | { ok: false; error: string };

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
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
      type: "post",
      prompt_used: opts.prompt,
      model_used: opts.model,
      raw_response: opts.raw.slice(0, 20_000),
    });
  } catch (e) {
    console.error("[gemini] ai_generation_logs insert failed:", e);
  }
}

/**
 * FR-16/FR-18: generate post text from stored location info + selected image
 * captions, log EVERY call to ai_generation_logs (type='post'), then insert
 * the post as `awaiting_approval` with `auto_publish_at = now + 2h` and
 * notify the owner ('post_ready'). Never throws.
 */
export async function generatePostText(opts: {
  locationId: string;
  imageIds: string[];
}): Promise<GeneratePostResult> {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const { data: locRows } = await db
      .from("locations")
      .select("id, owner_id, name, category, specialties, short_description, language")
      .eq("id", opts.locationId)
      .limit(1);
    const loc = locRows?.[0];
    if (!loc) return { ok: false, error: "Location not found" };

    const { data: imageRows } = await db
      .from("location_images")
      .select("id, caption")
      .eq("location_id", opts.locationId)
      .in("id", opts.imageIds);
    const byId = new Map((imageRows ?? []).map((i) => [i.id, i]));
    const images = opts.imageIds
      .map((id) => byId.get(id))
      .filter((i): i is NonNullable<typeof i> => Boolean(i));
    if (images.length === 0) {
      return { ok: false, error: "Select at least one image." };
    }

    const prompt = buildPostPrompt({
      locationName: loc.name,
      category: loc.category,
      specialties: loc.specialties,
      shortDescription: loc.short_description,
      imageCaptions: images.map((i) => i.caption?.trim() || "Business photo"),
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
        error:
          "AI is not configured yet (missing GEMINI_API_KEY). You can still write the post yourself.",
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

    const text = (json.candidates?.[0].content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim()
      .slice(0, 1500);

    await logGeneration({
      locationId: loc.id,
      prompt,
      model,
      raw: text || bodyText,
    });

    if (!text) {
      return { ok: false, error: "AI returned empty text. Try again." };
    }

    const autoPublishAt = new Date(Date.now() + AUTO_PUBLISH_DELAY_MS).toISOString();
    const { data: post, error: insErr } = await db
      .from("posts")
      .insert({
        location_id: loc.id,
        source_image_id: images[0].id,
        ai_generated_text: text,
        final_text: null,
        status: "awaiting_approval",
        auto_publish_at: autoPublishAt,
      })
      .select("id")
      .single();
    if (insErr || !post) {
      return {
        ok: false,
        error: `Could not save post: ${insErr?.message ?? "unknown"}`,
      };
    }

    await notify(loc.owner_id, "post_ready", post.id);
    return { ok: true, postId: post.id, text };
  } catch (e) {
    console.error("[gemini] generate post failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "AI generation failed." };
  }
}
