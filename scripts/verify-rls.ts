import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TABLES = [
  "_migrations",
  "admins",
  "admin_actions",
  "razorpay_events",
  "oauth_sessions",
  "owners",
  "auth_tokens",
  "subscriptions",
  "payments",
  "locations",
  "location_images",
  "reviews",
  "customers",
  "review_submissions",
  "tag_options",
  "posts",
  "notifications",
  "ai_generation_logs",
  "sync_logs",
] as const;

const PROBE_LABEL = "ZZ_RLS_PROBE_DELETE_ME";

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY.\n" +
      "Anon key: Supabase Dashboard → Settings → API (public anon key)."
  );
  process.exit(1);
}

const service: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anon: SupabaseClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false },
});

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.error(`  FAIL  ${msg}`);
};
const ok = (msg: string) => console.log(`  ok    ${msg}`);

async function structuralChecks(): Promise<void> {
  console.log("\n[1/3] Structural: RLS enabled + zero policies on every table");
  const { data, error } = await service.rpc("rls_status");
  if (error) {
    fail(`rls_status() RPC failed — did 0002_rls.sql run? (${error.message})`);
    return;
  }
  const rows = data as { table_name: string; rls_enabled: boolean; policy_count: number }[];
  for (const t of TABLES) {
    const row = rows.find((r) => r.table_name === t);
    if (!row) fail(`table missing: ${t}`);
    else if (!row.rls_enabled) fail(`RLS NOT enabled: ${t}`);
    else if (row.policy_count !== 0) fail(`${t} has ${row.policy_count} policy/policies — expected 0`);
    else ok(`${t}: RLS on, 0 policies`);
  }
  for (const r of rows) {
    if (!(TABLES as readonly string[]).includes(r.table_name))
      fail(`unexpected table (add to TABLES + enable RLS): ${r.table_name}`);
  }
}

async function anonSelectProbe(): Promise<void> {
  console.log("\n[2/3] Functional: anon key cannot see a real row");
  const { error: insErr } = await service
    .from("tag_options")
    .insert({ category: "probe", min_rating: 1, max_rating: 1, label: PROBE_LABEL, language: "english" });
  if (insErr) {
    fail(`could not insert probe row: ${insErr.message}`);
    return;
  }
  try {
    const { data, error } = await anon.from("tag_options").select("id").eq("label", PROBE_LABEL);
    if (error) ok(`anon select errored (blocked): ${error.message.slice(0, 60)}`);
    else if ((data ?? []).length === 0) ok("anon SELECT returned 0 rows for an existing row");
    else fail(`anon can READ ${data!.length} row(s) — RLS not blocking reads`);
  } finally {
    await service.from("tag_options").delete().eq("label", PROBE_LABEL);
  }
}

async function anonWriteProbes(): Promise<void> {
  console.log("\n[3/3] Functional: anon key DENIED on writes to every table");
  for (const table of TABLES) {
    const { error } = await anon.from(table).insert({} as never);
    if (error) ok(`denied: ${table}`);
    else fail(`anon INSERT SUCCEEDED on ${table} — RLS is not protecting it`);
  }
}

async function main(): Promise<void> {
  console.log("verify-rls — NFR-2 check");
  await structuralChecks();
  await anonSelectProbe();
  await anonWriteProbes();

  console.log(
    failures === 0
      ? "\nPASS — RLS on, zero policies, anon reads/writes blocked."
      : `\nFAIL — ${failures} problem(s) found.`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
