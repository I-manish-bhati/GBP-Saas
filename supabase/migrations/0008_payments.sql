-- M8+: per-owner payment receipts backing the Billing page's payment history.
-- Written idempotently by activateSlot()/markPaymentFailed() from BOTH the
-- webhook and the client confirm callback — the unique attempt key
-- (order_id, razorpay_payment_id) turns duplicate deliveries into no-ops.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  order_id text not null,
  razorpay_payment_id text not null,
  amount integer not null,
  currency text not null default 'INR',
  status text not null default 'captured',
  target_quantity integer,
  failure_reason text,
  created_at timestamptz not null default now(),
  constraint payments_status_check check (status in ('captured', 'failed')),
  constraint payments_amount_check check (amount >= 0)
);

create unique index if not exists payments_attempt_uniq
  on public.payments (order_id, razorpay_payment_id);

create index if not exists payments_owner_created_idx
  on public.payments (owner_id, created_at desc);

alter table public.payments enable row level security;
