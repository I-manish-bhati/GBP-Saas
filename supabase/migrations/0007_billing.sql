-- M8: Razorpay billing (D8 schema delta).
-- 1) Webhook event dedupe — every webhook delivery is processed at most once
--    (failed deliveries are retried by status='received'/'failed' rows).
-- 2) subscriptions.pending_quantity — location-removal policy (documented in
--    tasks.md M8): removal takes effect at period end, no partial refund.

create table if not exists public.razorpay_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text,
  payload jsonb not null,
  status text not null default 'received',
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint razorpay_events_status_check
    check (status in ('received', 'processed', 'ignored', 'failed'))
);

alter table public.razorpay_events enable row level security;

alter table public.subscriptions
  add column if not exists pending_quantity integer,
  add constraint subscriptions_pending_quantity_check
    check (pending_quantity is null or pending_quantity >= 0);
