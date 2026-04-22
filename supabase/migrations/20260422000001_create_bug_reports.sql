-- AI-8499: Bug report widget - user-submitted bug reports
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null default '',
  user_name text not null default '',
  title text not null,
  description text not null,
  category text not null default 'other',
  page_url text not null default '',
  user_agent text not null default '',
  status text not null default 'open',
  linear_issue_id text,
  linear_issue_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: users can insert their own reports, admins can read all
alter table public.bug_reports enable row level security;

create policy "Users can insert their own bug reports"
  on public.bug_reports for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own bug reports"
  on public.bug_reports for select
  using (auth.uid() = user_id);

-- Index for admin queries
create index if not exists idx_bug_reports_status on public.bug_reports(status);
create index if not exists idx_bug_reports_created on public.bug_reports(created_at desc);
