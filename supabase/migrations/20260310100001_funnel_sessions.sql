-- Funnel session storage
-- Stores chat messages and journey progress from the funnel app (u.joinsahara.com)
-- so data survives localStorage clears and can be migrated on signup.
-- Linear: AI-1903

create table if not exists public.funnel_sessions (
  id uuid default gen_random_uuid() primary key,
  session_id text unique not null,
  chat_messages jsonb not null default '[]'::jsonb,
  journey_progress jsonb not null default '{}'::jsonb,
  funnel_version text not null default '1.0',
  migrated_to_user_id uuid references auth.users(id),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for looking up sessions by ID (the primary access pattern)
create index if not exists idx_funnel_sessions_session_id on public.funnel_sessions(session_id);

-- Index for finding un-migrated sessions
create index if not exists idx_funnel_sessions_not_migrated
  on public.funnel_sessions(created_at)
  where migrated_to_user_id is null;

-- No RLS — this table is only accessed via service role from the API route
alter table public.funnel_sessions enable row level security;
