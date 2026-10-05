import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export type AuthTokenType = "email_verify" | "password_reset";

const EMAIL_VERIFY_TTL_SECONDS = 60 * 60 * 24;
const PASSWORD_RESET_TTL_SECONDS = 60 * 30;

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function issueAuthToken(
  ownerId: string,
  type: AuthTokenType
): Promise<{ raw: string; expiresAt: Date }> {
  const raw = randomBytes(32).toString("hex");
  const ttl = type === "email_verify" ? EMAIL_VERIFY_TTL_SECONDS : PASSWORD_RESET_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  const { error } = await db.from("auth_tokens").insert({
    owner_id: ownerId,
    type,
    token_hash: hashToken(raw),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error(`Failed to issue ${type} token: ${error.message}`);

  return { raw, expiresAt };
}

export async function consumeAuthToken(
  type: AuthTokenType,
  rawToken: string
): Promise<string | null> {
  const { data, error } = await db
    .from("auth_tokens")
    .select("id, owner_id")
    .eq("token_hash", hashToken(rawToken))
    .eq("type", type)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1);

  if (error || !data || data.length === 0) return null;

  // Conditional update makes concurrent double-use impossible.
  const { data: claimed } = await db
    .from("auth_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data[0].id)
    .is("used_at", null)
    .select("id");

  if (!claimed || claimed.length === 0) return null;

  await db
    .from("auth_tokens")
    .delete()
    .eq("owner_id", data[0].owner_id)
    .eq("type", type)
    .neq("id", data[0].id);

  return data[0].owner_id;
}
