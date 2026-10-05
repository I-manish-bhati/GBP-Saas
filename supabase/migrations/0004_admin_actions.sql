-- 0004_admin_actions.sql — audit trail for every admin mutation (FR-41, tasks.md M3)

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  detail jsonb,
  created_at timestamptz not null default now(),
  constraint admin_actions_action_check check (action in ('suspend_owner', 'resume_owner')),
  constraint admin_actions_target_type_check check (target_type in ('owner'))
);

create index if not exists admin_actions_target_idx
  on public.admin_actions (target_type, target_id, created_at desc);

create index if not exists admin_actions_admin_idx
  on public.admin_actions (admin_id, created_at desc);

alter table public.admin_actions enable row level security;
