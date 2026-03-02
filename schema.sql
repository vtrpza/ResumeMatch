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
