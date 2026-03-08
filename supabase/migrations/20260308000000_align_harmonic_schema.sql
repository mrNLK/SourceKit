-- Align database schema with harmonic-person and harmonic-intelligence edge functions.
-- Adds missing tables, columns, and relaxes check constraints.

-- 1. Add missing columns to aifund_people for Harmonic enrichment
alter table aifund_people
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists "current_role" text,
  add column if not exists bio text,
  add column if not exists harmonic_person_id text,
  add column if not exists harmonic_enriched_at timestamptz,
  add column if not exists metadata jsonb;

-- 2. Add missing columns to aifund_intelligence_runs
alter table aifund_intelligence_runs
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists results_count integer default 0,
  add column if not exists completed_at timestamptz,
  add column if not exists results_summary jsonb,
  add column if not exists query_params jsonb default '{}';

-- 3. Relax provider check constraint to include 'harmonic'
alter table aifund_intelligence_runs drop constraint if exists aifund_intelligence_runs_provider_check;
alter table aifund_intelligence_runs
  add constraint aifund_intelligence_runs_provider_check
  check (provider in ('exa', 'parallel', 'github', 'internal', 'referral', 'harmonic'));

-- 4. Relax status check constraint to include 'pending', 'completed', 'failed'
alter table aifund_intelligence_runs drop constraint if exists aifund_intelligence_runs_status_check;
alter table aifund_intelligence_runs
  add constraint aifund_intelligence_runs_status_check
  check (status in ('ready', 'running', 'needs_keys', 'error', 'pending', 'completed', 'failed'));

-- 5. Make action column nullable (edge function doesn't set it)
alter table aifund_intelligence_runs alter column action drop not null;

-- 6. Relax action check constraint
alter table aifund_intelligence_runs drop constraint if exists aifund_intelligence_runs_action_check;
alter table aifund_intelligence_runs
  add constraint aifund_intelligence_runs_action_check
  check (action is null or action in ('research', 'discovery', 'monitor', 'mapping', 'status_check', 'search'));

-- 7. Create aifund_harmonic_companies table
create table if not exists aifund_harmonic_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  harmonic_company_id text not null,
  name text,
  domain text,
  linkedin_url text,
  website_url text,
  location text,
  funding_stage text,
  funding_total numeric,
  last_funding_date text,
  last_funding_total numeric,
  headcount integer,
  headcount_growth_30d numeric,
  headcount_growth_90d numeric,
  tags text[] default '{}',
  founders jsonb default '[]',
  raw_payload jsonb,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, harmonic_company_id)
);

alter table aifund_harmonic_companies enable row level security;

create policy "Users can read own harmonic companies"
  on aifund_harmonic_companies for select
  using (auth.uid() = user_id or auth.role() = 'service_role');

create policy "Service role can manage harmonic companies"
  on aifund_harmonic_companies for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 8. Create aifund_harmonic_saved_searches table
create table if not exists aifund_harmonic_saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid references aifund_concepts(id) on delete set null,
  query_text text not null,
  query_hash text not null,
  harmonic_saved_search_id text,
  status text not null default 'draft',
  last_run_id uuid references aifund_intelligence_runs(id) on delete set null,
  result_count integer default 0,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table aifund_harmonic_saved_searches enable row level security;

create policy "Users can manage own harmonic saved searches"
  on aifund_harmonic_saved_searches for all
  using (auth.uid() = user_id or auth.role() = 'service_role')
  with check (auth.uid() = user_id or auth.role() = 'service_role');

-- 9. Add missing columns to aifund_external_profiles for Harmonic person enrichment
-- The edge function uses: platform, profile_url, profile_data, fetched_at
alter table aifund_external_profiles
  add column if not exists platform text,
  add column if not exists profile_url text,
  add column if not exists profile_data jsonb,
  add column if not exists fetched_at timestamptz;

-- Relax the provider check to include 'harmonic'
alter table aifund_external_profiles drop constraint if exists aifund_external_profiles_provider_check;
alter table aifund_external_profiles
  add constraint aifund_external_profiles_provider_check
  check (provider is null or provider in ('exa', 'parallel', 'github', 'internal', 'referral', 'harmonic'));

-- Make profile_type nullable (harmonic doesn't use it)
alter table aifund_external_profiles alter column profile_type drop not null;
alter table aifund_external_profiles drop constraint if exists aifund_external_profiles_profile_type_check;
alter table aifund_external_profiles
  add constraint aifund_external_profiles_profile_type_check
  check (profile_type is null or profile_type in ('github', 'linkedin', 'web', 'referral', 'harmonic'));

-- Make provider nullable (harmonic uses platform column instead)
alter table aifund_external_profiles alter column provider drop not null;

-- 10. Add user_id to aifund_people rows and RLS policies scoped to user
-- Update existing RLS to scope by user_id where available
do $$
begin
  -- Add service_role policy for aifund_people so edge functions can update
  if not exists (
    select 1 from pg_policies where tablename = 'aifund_people' and policyname = 'service_role_manage_people'
  ) then
    execute 'create policy service_role_manage_people on aifund_people for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')';
  end if;

  -- Add service_role policy for aifund_external_profiles
  if not exists (
    select 1 from pg_policies where tablename = 'aifund_external_profiles' and policyname = 'service_role_manage_profiles'
  ) then
    execute 'create policy service_role_manage_profiles on aifund_external_profiles for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')';
  end if;

  -- Add service_role policy for aifund_intelligence_runs
  if not exists (
    select 1 from pg_policies where tablename = 'aifund_intelligence_runs' and policyname = 'service_role_manage_runs'
  ) then
    execute 'create policy service_role_manage_runs on aifund_intelligence_runs for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')';
  end if;
end $$;

-- 11. Backfill user_id on existing aifund_people rows
-- Set to the first authenticated user if only one exists
do $$
declare
  single_user_id uuid;
  user_count integer;
begin
  select count(*) into user_count from auth.users;
  if user_count = 1 then
    select id into single_user_id from auth.users limit 1;
    update aifund_people set user_id = single_user_id where user_id is null;
    update aifund_intelligence_runs set user_id = single_user_id where user_id is null;
  end if;
end $$;
