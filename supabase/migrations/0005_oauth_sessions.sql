-- 0005_oauth_sessions.sql — short-lived server-side state for the GBP OAuth
-- flow (state/PKCE + fetched-locations payload awaiting owner selection).
-- Single-use: callback consumes the row; selection consumes it again.

create table if not exists public.oauth_sessions (
  state_hash text primary key,
  owner_id uuid not null references public.owners(id) on delete cascade,
  code_verifier text not null,
  reconnect_location_id uuid references public.locations(id) on delete cascade,
  payload jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists oauth_sessions_expires_idx
  on public.oauth_sessions (expires_at);

alter table public.oauth_sessions enable row level security;
