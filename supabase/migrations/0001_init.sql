-- 0001_init.sql â€” GBP Management + QR Review SaaS core schema
-- Source: plan.md Â§8 + v2 schema deltas (tasks.md M1)
-- Apply once on a fresh Supabase project (SQL editor or supabase db push).

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- admins (internal operators; own JWT, role=admin â€” FR-38)
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- owners (FR-1..5)
create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  email_verified boolean not null default false,
  password_hash text not null,
  name text,
  phone text,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint owners_email_format check (email = lower(email))
);

drop trigger if exists owners_set_updated_at on public.owners;
create trigger owners_set_updated_at
  before update on public.owners
  for each row execute function public.set_updated_at();

-- email verification + password reset tokens (hashed, single-use, expiring)
create table if not exists public.auth_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  type text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint auth_tokens_type_check check (type in ('email_verify', 'password_reset'))
);

create index if not exists auth_tokens_owner_type_idx
  on public.auth_tokens (owner_id, type, created_at desc);

-- ---------------------------------------------------------------------------
-- subscriptions â€” one per owner, quantity = billed locations (FR-34)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.owners(id) on delete cascade,
  status text not null default 'active',
  razorpay_subscription_id text,
  plan_id text,
  quantity integer not null default 1,
  currency text not null default 'INR',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_status_check check (status in ('active', 'past_due', 'cancelled')),
  constraint subscriptions_quantity_check check (quantity >= 0)
);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- locations â€” shared entity for GBP side + QR side (plan Â§8)
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  google_location_id text not null unique,
  name text not null,
  category text,
  short_description text,
  specialties text[] not null default '{}',
  city text,
  language text not null default 'english',
  google_place_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  connection_status text not null default 'connected',
  slug text not null unique,
  qr_template text,
  brand_color text,
  tagline text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_language_check check (language in ('hindi', 'hinglish', 'english')),
  constraint locations_connection_status_check check (connection_status in ('connected', 'token_expired', 'revoked'))
);

drop trigger if exists locations_set_updated_at on public.locations;
create trigger locations_set_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

create index if not exists locations_owner_idx on public.locations (owner_id);

-- ---------------------------------------------------------------------------
create table if not exists public.location_images (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  image_url text not null,
  cloudinary_public_id text not null,
  caption text,
  uploaded_at timestamptz not null default now()
);

create index if not exists location_images_location_idx
  on public.location_images (location_id, uploaded_at desc);

-- ---------------------------------------------------------------------------
-- reviews â€” reviews already on Google; owner replies to them (FR-11..15)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  google_review_id text not null unique,
  reviewer_name text,
  rating integer not null,
  review_text text,
  ai_reply_draft text,
  final_reply text,
  status text not null default 'pending',
  replied_at timestamptz,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_rating_check check (rating between 1 and 5),
  constraint reviews_status_check check (status in ('pending', 'drafted', 'replied', 'skipped'))
);

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create index if not exists reviews_location_status_idx
  on public.reviews (location_id, status);

-- ---------------------------------------------------------------------------
-- customers â€” QR flow end-users (Google login, separate identity space)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,
  email text,
  name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- review_submissions â€” QR-drafted reviews, before/independent of Google posting
create table if not exists public.review_submissions (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  rating integer not null,
  tags text[] not null default '{}',
  ai_draft text,
  final_text text not null,
  clicked_google_post boolean not null default false,
  created_at timestamptz not null default now(),
  constraint review_submissions_rating_check check (rating between 1 and 5)
);

-- powers the max-3-per-(location,customer)-per-day check (FR-32)
create index if not exists review_submissions_limit_idx
  on public.review_submissions (location_id, customer_id, created_at);

-- ---------------------------------------------------------------------------
-- tag_options â€” rating-based QR tag chips, editable without code change
create table if not exists public.tag_options (
  id uuid primary key default gen_random_uuid(),
  category text,
  min_rating integer not null,
  max_rating integer not null,
  label text not null,
  language text not null default 'english',
  constraint tag_options_rating_check check (min_rating between 1 and 5 and max_rating between 1 and 5 and min_rating <= max_rating),
  constraint tag_options_language_check check (language in ('hindi', 'hinglish', 'english'))
);

create index if not exists tag_options_lookup_idx
  on public.tag_options (language, min_rating, max_rating);

-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  source_image_id uuid references public.location_images(id) on delete set null,
  ai_generated_text text,
  final_text text,
  status text not null default 'draft',
  auto_publish_at timestamptz,
  published_at timestamptz,
  google_post_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_status_check check (status in ('draft', 'awaiting_approval', 'scheduled', 'published', 'failed'))
);

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create index if not exists posts_status_autopublish_idx
  on public.posts (status, auto_publish_at);

-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  type text not null,
  reference_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('post_ready', 'token_expired', 'payment_failed', 'post_failed'))
);

create index if not exists notifications_owner_idx
  on public.notifications (owner_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (owner_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- ai_generation_logs â€” NFR-5 audit of every prompt/response
create table if not exists public.ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  type text not null,
  prompt_used text not null,
  model_used text,
  raw_response text,
  created_at timestamptz not null default now(),
  constraint ai_generation_logs_type_check check (type in ('review_reply', 'post', 'review_draft'))
);

create index if not exists ai_generation_logs_location_idx
  on public.ai_generation_logs (location_id, created_at desc);

-- ---------------------------------------------------------------------------
-- sync_logs â€” every external API attempt (NFR-5, admin drill-down FR-40)
create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id) on delete cascade,
  operation text not null,
  status text not null,
  error_message text,
  created_at timestamptz not null default now(),
  constraint sync_logs_operation_check check (operation in ('fetch_reviews', 'publish_reply', 'publish_post', 'refresh_token', 'fetch_locations', 'generate_ai')),
  constraint sync_logs_status_check check (status in ('success', 'failed'))
);

create index if not exists sync_logs_location_idx
  on public.sync_logs (location_id, created_at desc);
