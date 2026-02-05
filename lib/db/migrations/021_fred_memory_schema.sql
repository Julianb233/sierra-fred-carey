-- FRED Memory Schema Migration
-- Phase 01-01: Database schema for FRED's three-layer memory architecture
-- Created: 2026-02-05

-- Enable pgvector extension for embedding storage and similarity search
create extension if not exists vector with schema extensions;

------------------------------------------------------------
-- Episodic Memory Table
-- Stores conversation history, decisions made, and their outcomes
------------------------------------------------------------

create table if not exists fred_episodic_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  event_type text not null check (event_type in ('conversation', 'decision', 'outcome', 'feedback')),
  content jsonb not null,
  embedding vector(1536), -- OpenAI ada-002/text-embedding-3-small dimension
  importance_score float default 0.5 check (importance_score >= 0 and importance_score <= 1),
  created_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

-- Performance indexes for episodic memory
create index if not exists fred_episodic_user_idx on fred_episodic_memory(user_id);
create index if not exists fred_episodic_session_idx on fred_episodic_memory(session_id);
create index if not exists fred_episodic_type_idx on fred_episodic_memory(event_type);
create index if not exists fred_episodic_created_idx on fred_episodic_memory(created_at desc);

-- Vector similarity search index (IVFFlat for efficiency)
-- Using 100 lists as reasonable starting point for expected data volume
create index if not exists fred_episodic_embedding_idx on fred_episodic_memory
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Composite index for common query patterns
create index if not exists fred_episodic_user_created_idx on fred_episodic_memory(user_id, created_at desc);

------------------------------------------------------------
-- Semantic Memory Table
-- Stores learned facts, patterns, and knowledge about the user/startup
------------------------------------------------------------

create table if not exists fred_semantic_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text not null check (category in (
    'startup_facts',
    'user_preferences',
    'market_knowledge',
    'team_info',
    'investor_info',
    'product_details',
    'metrics',
    'goals',
    'challenges',
    'decisions'
  )),
  key text not null,
  value jsonb not null,
  embedding vector(1536),
  confidence float default 1.0 check (confidence >= 0 and confidence <= 1),
  source text, -- where this knowledge came from (e.g., 'user_input', 'inferred', 'document')
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id, category, key)
);

-- Performance indexes for semantic memory
create index if not exists fred_semantic_user_idx on fred_semantic_memory(user_id);
create index if not exists fred_semantic_category_idx on fred_semantic_memory(category);
create index if not exists fred_semantic_user_category_idx on fred_semantic_memory(user_id, category);

-- Vector similarity search index
create index if not exists fred_semantic_embedding_idx on fred_semantic_memory
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Trigger to update updated_at on modification
create or replace function update_fred_semantic_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists fred_semantic_updated_at_trigger on fred_semantic_memory;
create trigger fred_semantic_updated_at_trigger
  before update on fred_semantic_memory
  for each row
  execute function update_fred_semantic_updated_at();

------------------------------------------------------------
-- Procedural Memory Table
-- Stores action patterns, decision frameworks, and execution templates
-- This is global (not per-user) - represents FRED's learned behaviors
------------------------------------------------------------

create table if not exists fred_procedural_memory (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  procedure_type text not null check (procedure_type in (
    'decision_framework',
    'action_template',
    'analysis_pattern',
    'scoring_model',
    'assessment_rubric'
  )),
  steps jsonb not null, -- ordered array of steps
  triggers jsonb, -- conditions that activate this procedure
  input_schema jsonb, -- expected input format
  output_schema jsonb, -- expected output format
  success_rate float default 0.5 check (success_rate >= 0 and success_rate <= 1),
  usage_count int default 0,
  version int default 1,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Performance indexes for procedural memory
create index if not exists fred_procedural_name_idx on fred_procedural_memory(name);
create index if not exists fred_procedural_type_idx on fred_procedural_memory(procedure_type);
create index if not exists fred_procedural_active_idx on fred_procedural_memory(is_active) where is_active = true;

-- Trigger to update updated_at on modification
drop trigger if exists fred_procedural_updated_at_trigger on fred_procedural_memory;
create trigger fred_procedural_updated_at_trigger
  before update on fred_procedural_memory
  for each row
  execute function update_fred_semantic_updated_at();

------------------------------------------------------------
-- FRED Decision Log Table
-- Tracks all decisions made with full context for learning/improvement
------------------------------------------------------------

create table if not exists fred_decision_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  decision_type text not null, -- 'auto', 'recommended', 'escalated'
  input_context jsonb not null, -- what information was provided
  analysis jsonb, -- FRED's analysis
  scores jsonb, -- 7-factor scores
  recommendation jsonb, -- what FRED recommended
  final_decision jsonb, -- what was actually decided (may differ if escalated)
  outcome jsonb, -- recorded outcome (filled in later)
  outcome_score float, -- how well the decision worked out
  procedure_used text references fred_procedural_memory(name),
  confidence float check (confidence >= 0 and confidence <= 1),
  created_at timestamptz default now(),
  decided_at timestamptz,
  outcome_recorded_at timestamptz
);

-- Performance indexes for decision log
create index if not exists fred_decision_user_idx on fred_decision_log(user_id);
create index if not exists fred_decision_session_idx on fred_decision_log(session_id);
create index if not exists fred_decision_type_idx on fred_decision_log(decision_type);
create index if not exists fred_decision_created_idx on fred_decision_log(created_at desc);
create index if not exists fred_decision_procedure_idx on fred_decision_log(procedure_used);

------------------------------------------------------------
-- Row Level Security (RLS) Policies
------------------------------------------------------------

-- Enable RLS
alter table fred_episodic_memory enable row level security;
alter table fred_semantic_memory enable row level security;
alter table fred_decision_log enable row level security;

-- Episodic memory: users can only access their own data
create policy "Users can view own episodic memory"
  on fred_episodic_memory for select
  using (auth.uid() = user_id);

create policy "Users can insert own episodic memory"
  on fred_episodic_memory for insert
  with check (auth.uid() = user_id);

create policy "Users can update own episodic memory"
  on fred_episodic_memory for update
  using (auth.uid() = user_id);

-- Semantic memory: users can only access their own data
create policy "Users can view own semantic memory"
  on fred_semantic_memory for select
  using (auth.uid() = user_id);

create policy "Users can insert own semantic memory"
  on fred_semantic_memory for insert
  with check (auth.uid() = user_id);

create policy "Users can update own semantic memory"
  on fred_semantic_memory for update
  using (auth.uid() = user_id);

-- Procedural memory: read-only for all (global knowledge)
create policy "Anyone can view procedural memory"
  on fred_procedural_memory for select
  to authenticated
  using (is_active = true);

-- Decision log: users can only access their own decisions
create policy "Users can view own decisions"
  on fred_decision_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own decisions"
  on fred_decision_log for insert
  with check (auth.uid() = user_id);

create policy "Users can update own decisions"
  on fred_decision_log for update
  using (auth.uid() = user_id);

------------------------------------------------------------
-- Service role bypasses RLS for backend operations
------------------------------------------------------------

-- Create policies for service role to manage all data
create policy "Service role manages episodic memory"
  on fred_episodic_memory for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role manages semantic memory"
  on fred_semantic_memory for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role manages procedural memory"
  on fred_procedural_memory for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role manages decision log"
  on fred_decision_log for all
  using (auth.jwt() ->> 'role' = 'service_role');
