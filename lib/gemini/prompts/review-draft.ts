export interface ReviewDraftInput {
  locationName: string;
  category: string | null;
  city: string | null;
  rating: number;
  tags: string[];
  language: "hindi" | "hinglish" | "english";
}

/**
 * M9/FR-29: customer review draft. Same no-invented-specifics constraint as
 * posts — the model may only use facts we give it (name, city, category,
 * rating, tags); never invent dishes, staff, prices, or events.
 */
export function buildReviewDraftPrompt(input: ReviewDraftInput): string {
  const facts = [
    `Business: ${input.locationName}`,
    input.category ? `Category: ${input.category}` : null,
    input.city ? `City: ${input.city}` : null,
    `Rating: ${input.rating}/5`,
    input.tags.length > 0 ? `Customer's selected tags: ${input.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const languageLine =
    input.language === "hindi"
      ? "Write the review in Hindi (Devanagari script)."
      : input.language === "hinglish"
        ? "Write the review in Hinglish (Roman script Hindi with English words)."
        : "Write the review in English.";

  return `You are helping a happy customer of a local business write a short Google review.

${facts}
${languageLine}

Rules:
- Write in the first person as the customer who visited.
- Use ONLY the facts above. Do NOT invent specific dishes, product names, staff names, prices, dates, addresses, or events.
- Match the sentiment to the rating: 5 = delighted, 4 = positive with a small note, 3 = mixed, 2 = disappointed, 1 = unhappy but civil.
- 2 to 4 sentences, plain text only: no quotes, no hashtags, no emojis, no greeting or sign-off, and never mention AI or that this was generated.
- Google requires original content — write naturally, as a person would.

Return only the review text.`;
}
