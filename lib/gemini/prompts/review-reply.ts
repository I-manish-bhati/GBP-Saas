export interface ReviewReplyPromptInput {
  locationName: string;
  category: string | null;
  specialties: string[] | null;
  shortDescription: string | null;
  reviewText: string | null;
  rating: number;
  language: "hindi" | "hinglish" | "english";
}

const LANGUAGE_RULES: Record<ReviewReplyPromptInput["language"], string> = {
  english: "Write the reply in English.",
  hindi: "Write the reply in Hindi (Devanagari script).",
  hinglish: "Write the reply in Hinglish (Hindi words in Latin script, as Indians casually type).",
};

/**
 * FR-14/NFR-7: strict, factual reply draft. Output = reply text only.
 * No invented facts, offers, discounts, or promises — ever.
 */
export function buildReviewReplyPrompt(input: ReviewReplyPromptInput): string {
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

  const review = input.reviewText?.trim()
    ? `"${input.reviewText.trim()}"`
    : "(no text — the reviewer only left a star rating)";

  return `You are writing a public reply from the business owner to a Google review.

${facts}

Review (${input.rating}/5 stars): ${review}

Rules:
- ${LANGUAGE_RULES[input.language]}
- Reply only to what the reviewer actually said. Thank them, address their point briefly.
- NEVER invent facts: no offers, discounts, prices, guarantees, awards, or claims not present in the business info above.
- Do not mention AI, robots, or "on behalf of".
- Do not ask the reviewer to change their review.
- Maximum 3 sentences. Plain text only — no markdown, no quotes, no greeting like "Dear customer".
- Output ONLY the reply text.`;
}
