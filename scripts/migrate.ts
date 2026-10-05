import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "pg";

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const DB_URL = process.env.SUPABASE_DB_URL;

if (!DB_URL) {
  console.error(
    "Missing SUPABASE_DB_URL.\n" +
      "Supabase Dashboard → Settings → Database → Connection string → URI (direct, port 5432),\n" +
      "replace [YOUR-PASSWORD] with the database password you saved at project creation,\n" +
      "then paste it into .env.local."
  );
  process.exit(1);
}

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

async function main(): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (files.length === 0) {
    console.error("No .sql files in supabase/migrations/");
    process.exit(1);
  }

  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query(
      "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())"
    );
    // NFR-2: every public table has RLS + zero policies, including this one.
    await client.query("alter table _migrations enable row level security");

    const appliedRows = await client.query<{ name: string }>("select name from _migrations");
    const applied = new Set(appliedRows.rows.map((r) => r.name));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip    ${file} (already applied)`);
        continue;
      }
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      console.log(`apply   ${file} …`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into _migrations (name) values ($1)", [file]);
        await client.query("commit");
        console.log(`  ok`);
      } catch (e) {
        await client.query("rollback");
        throw e;
      }
    }

    const status = await client.query<{ table_name: string; rls_enabled: boolean; policy_count: number }>(
      "select * from rls_status()"
    );
    const bad = status.rows.filter((r) => !r.rls_enabled || r.policy_count !== 0);
    console.log(`\nRLS check: ${status.rows.length} tables`);
    if (bad.length > 0) {
      console.error("FAIL — tables not protected:", bad);
      process.exitCode = 1;
    } else {
      console.log("PASS — all tables RLS-enabled with 0 policies.");
    }

    const { rows: tagRows } = await client.query<{ n: string }>(
      "select count(*)::text as n from tag_options"
    );
    console.log(`tag_options rows: ${tagRows[0].n}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("Migration failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
