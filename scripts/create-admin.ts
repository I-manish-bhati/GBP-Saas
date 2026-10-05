import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import argon2 from "argon2";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD } =
  process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!ADMIN_SEED_EMAIL || !ADMIN_SEED_PASSWORD) {
  console.error(
    "Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in .env.local (or the environment) first."
  );
  process.exit(1);
}

const resetMode = process.argv.includes("--reset-password");

async function main(): Promise<void> {
  const db = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const email = ADMIN_SEED_EMAIL!.trim().toLowerCase();
  const passwordHash = await argon2.hash(ADMIN_SEED_PASSWORD!, { type: argon2.argon2id });

  const { data: existing, error: selErr } = await db
    .from("admins")
    .select("id, is_active")
    .eq("email", email)
    .limit(1);

  if (selErr) {
    console.error("Lookup failed:", selErr.message);
    process.exit(1);
  }

  if (existing && existing.length > 0) {
    if (!resetMode) {
      console.log(
        `Admin ${email} already exists. Use --reset-password to set ADMIN_SEED_PASSWORD as its new password.`
      );
      return;
    }
    const { error } = await db
      .from("admins")
      .update({ password_hash: passwordHash, is_active: true })
      .eq("id", existing[0].id);
    if (error) {
      console.error("Update failed:", error.message);
      process.exit(1);
    }
    console.log(`Password reset for admin ${email} (reactivated).`);
    return;
  }

  const { error: insErr } = await db.from("admins").insert({
    email,
    password_hash: passwordHash,
    name: "Administrator",
    is_active: true,
  });
  if (insErr) {
    console.error("Insert failed:", insErr.message);
    process.exit(1);
  }
  console.log(`Created admin ${email}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
