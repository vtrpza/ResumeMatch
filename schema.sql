-- Neon Postgres schema for Resume Match MVP
-- Run this in the Neon SQL editor after creating a project.

create table if not exists sessions (
  id text primary key,
  scan_count int not null default 0,
  purchased_scans int not null default 0,
  subscription_valid_until timestamptz
);

-- Add purchased_scans for existing deployments (no-op if already present)
alter table sessions add column if not exists purchased_scans int not null default 0;

-- Optional: index for cleanup of old sessions
create index if not exists idx_sessions_subscription on sessions (subscription_valid_until) where subscription_valid_until is not null;

-- Idempotent checkout credit (redirect + webhook can both run; credit once per Stripe session)
create table if not exists processed_checkouts (
  stripe_session_id text primary key
);

-- Verified identity: one free scan per identity (email), prevents multi-browser abuse
create table if not exists identities (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  email_verified_at timestamptz,
  scan_count int not null default 0,
  purchased_scans int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_identities_email on identities (lower(trim(email)));

-- One-time magic link tokens for email verification
create table if not exists verification_tokens (
  token text primary key,
  identity_id uuid not null references identities(id) on delete cascade,
  expires_at timestamptz not null
);

create index if not exists idx_verification_tokens_expires on verification_tokens (expires_at);

-- Session tokens: HttpOnly cookie value -> identity (for usage/scan after verification)
create table if not exists identity_sessions (
  token text primary key,
  identity_id uuid not null references identities(id) on delete cascade,
  expires_at timestamptz not null
);

create index if not exists idx_identity_sessions_identity on identity_sessions (identity_id);
create index if not exists idx_identity_sessions_expires on identity_sessions (expires_at);
