-- Neon Postgres schema for Resume Match MVP
-- Run this in the Neon SQL editor after creating a project.

create table if not exists sessions (
  id text primary key,
  scan_count int not null default 0,
  subscription_valid_until timestamptz
);

-- Optional: index for cleanup of old sessions
create index if not exists idx_sessions_subscription on sessions (subscription_valid_until) where subscription_valid_until is not null;
