-- 0006_reviews_deleted.sql — soft-delete marker for reviews that vanished
-- from Google (tasks.md M5 edit/delete policy: never hard-delete).

alter table public.reviews add column if not exists deleted_at timestamptz;
