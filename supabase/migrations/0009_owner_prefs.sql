-- Settings expansion (Oct 5): per-owner notification preferences.
-- Shape is app-owned (no jsonb constraint) — lib/notify.ts merges it with
-- defaults so a missing/empty object behaves exactly like pre-0009:
--   { "email": false,
--     "inApp": { "post_ready": true, "token_expired": true,
--                "payment_failed": true, "post_failed": true } }
-- email=false keeps notification mail off by default (Resend sandbox can only
-- deliver to the account owner's address until the domain is verified).
alter table public.owners
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;

comment on column public.owners.notification_prefs is
  'Owner notification preferences (bell filtering + optional email copies), merged with defaults in lib/notify.ts.';
