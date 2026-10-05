export type CustomerStatePayload = {
  state: string;
  verifier: string;
  next: string;
};

/** Only allow post-login redirects back into the QR flow. */
export function safeReviewNext(next: string | null): string {
  return next && next.startsWith("/r/") ? next : "/";
}
