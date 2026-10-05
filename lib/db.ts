import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill in the values (Supabase Dashboard → Settings → API)."
  );
}

// Singleton: avoids exhausting PostgREST connections in dev hot-reload.
// service_role bypasses RLS — every caller MUST enforce owner_id scoping.
const globalForDb = globalThis as typeof globalThis & { __supabaseAdmin?: SupabaseClient };

export const db: SupabaseClient =
  globalForDb.__supabaseAdmin ??
  createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__supabaseAdmin = db;
}
