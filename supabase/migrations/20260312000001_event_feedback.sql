-- Event Feedback Collection Framework (AI-1804)
-- Stores feedback from event attendees (first 200 users)

create table if not exists public.event_feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  event_name text,
  -- Widget feedback
  rating smallint check (rating >= 1 and rating <= 5),
  feedback_text text,
  -- Micro-survey fields
  fred_rating smallint check (fred_rating >= 1 and fred_rating <= 5),
  improvement_text text,
  recommend text check (recommend in ('yes', 'maybe', 'no')),
  -- Metadata
  source text not null default 'widget' check (source in ('widget', 'survey')),
  user_tier text,
  created_at timestamptz default now() not null
);

-- Index for admin queries
create index idx_event_feedback_created_at on public.event_feedback (created_at desc);
create index idx_event_feedback_user_id on public.event_feedback (user_id);
create index idx_event_feedback_source on public.event_feedback (source);

-- RLS policies
alter table public.event_feedback enable row level security;

-- Users can insert their own feedback
create policy "Users can insert own event feedback"
  on public.event_feedback for insert
  with check (auth.uid() = user_id);

-- Users can read their own feedback (to check survey_completed)
create policy "Users can read own event feedback"
  on public.event_feedback for select
  using (auth.uid() = user_id);

-- Service role can read all (for admin API)
create policy "Service role can read all event feedback"
  on public.event_feedback for select
  using (auth.role() = 'service_role');
