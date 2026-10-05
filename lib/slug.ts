import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

function randomSuffix(): string {
  return randomBytes(6).toString("hex"); // 12 hex chars (D8: 8–12 char suffix)
}

/**
 * D8: slugify(name) + "-" + crypto suffix, retried on unique collision.
 * The slug is the public QR URL /r/{slug} (FR-24), so it must be stable —
 * we never regenerate on update.
 */
export async function generateSlug(name: string): Promise<string> {
  const base = slugify(name) || "location";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${base}-${randomSuffix()}`;
    const { data } = await db
      .from("locations")
      .select("id")
      .eq("slug", candidate)
      .limit(1);
    if (!data || data.length === 0) return candidate;
  }
  throw new Error("Could not generate a unique slug after 5 attempts.");
}
