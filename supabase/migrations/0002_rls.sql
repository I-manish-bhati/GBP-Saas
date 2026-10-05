-- 0002_rls.sql — RLS ON, zero policies on every table (NFR-2, plan §4)
-- Result: anon/authenticated have NO access to any row.
-- The Next.js server uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS);
-- all authorization happens in route handlers (owner_id checks).
-- Verify with scripts/verify-rls.ts.

alter table public.admins             enable row level security;
alter table public.owners             enable row level security;
alter table public.auth_tokens        enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.locations          enable row level security;
alter table public.location_images    enable row level security;
alter table public.reviews            enable row level security;
alter table public.customers          enable row level security;
alter table public.review_submissions enable row level security;
alter table public.tag_options        enable row level security;
alter table public.posts              enable row level security;
alter table public.notifications      enable row level security;
alter table public.ai_generation_logs enable row level security;
alter table public.sync_logs          enable row level security;

-- Intentionally NO create policy statements: no policy = no access
-- for non-privileged roles. Do not add policies without a design review.

-- Read-only status helper for scripts/verify-rls.ts.
-- Callable ONLY by service_role — never by anon/authenticated.
create or replace function public.rls_status()
returns table (table_name text, rls_enabled boolean, policy_count integer)
language sql
security definer
set search_path = public
as $$
  select c.relname::text,
         c.relrowsecurity,
         (
           select count(*)::int
           from pg_policies p
           where p.schemaname = 'public' and p.tablename = c.relname
         )
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by c.relname;
$$;

revoke execute on function public.rls_status() from public, anon, authenticated;
grant execute on function public.rls_status() to service_role;
