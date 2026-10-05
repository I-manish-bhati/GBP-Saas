export interface PostPromptInput {
  locationName: string;
  category: string | null;
  specialties: string[] | null;
  shortDescription: string | null;
  imageCaptions: string[];
  language: "hindi" | "hinglish" | "english";
}

const LANGUAGE_RULES: Record<PostPromptInput["language"], string> = {
  english: "Write the post in English.",
  hindi: "Write the post in Hindi (Devanagari script).",
  hinglish: "Write the post in Hinglish (Hindi words in Latin script, as Indians casually type).",
};

/**
 * FR-16/FR-17/NFR-7: a Google Business post built ONLY from stored location
 * info + selected image captions. Explicit no-invention rules (no offers,
 * discounts, events, prices, dates, or facts not in the input). Output =
 * post text only.
 */
export function buildPostPrompt(input: PostPromptInput): string {
  const facts = [
    `Business: ${input.locationName}`,
    input.category ? `Category: ${input.category}` : null,
    input.specialties && input.specialties.length > 0
      ? `Specialties: ${input.specialties.join(", ")}`
      : null,
    input.shortDescription ? `About the business: ${input.shortDescription}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const captions =
    input.imageCaptions.length > 0
      ? input.imageCaptions.map((c, i) => `- Image ${i + 1}: ${c}`).join("\n")
      : "(none)";

  return `You are writing a Google Business Profile post for a local business.

${facts}

Selected image captions:
${captions}

Rules:
- ${LANGUAGE_RULES[input.language]}
- Use ONLY the information above. Reference the images only through their captions.
- NEVER invent facts: no offers, discounts, sales, events, prices, dates, opening hours, awards, or claims not present in the input above.
- Do not mention AI, robots, or social media templates.
- Friendly, natural, customer-facing tone. No questions, no calls to "follow us".
- Maximum 600 characters. Plain text only — no markdown, no emoji unless in captions.
- Output ONLY the post text.`;
}
