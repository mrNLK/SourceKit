alter table public.aifund_people
  add column if not exists harmonic_person_id text,
  add column if not exists harmonic_enriched_at timestamptz;

alter table public.aifund_external_profiles
  add column if not exists platform text,
  add column if not exists profile_url text,
  add column if not exists profile_data jsonb,
  add column if not exists fetched_at timestamptz default now();

create table if not exists public.aifund_harmonic_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  harmonic_company_id text not null,
  name text not null,
  domain text,
  linkedin_url text,
  website_url text,
  location text,
  funding_stage text,
  funding_total numeric,
  last_funding_date timestamptz,
  last_funding_total numeric,
  headcount integer,
  headcount_growth_30d numeric,
  headcount_growth_90d numeric,
  tags text[] not null default '{}'::text[],
  founders jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aifund_harmonic_saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null references public.aifund_concepts(id) on delete cascade,
  harmonic_saved_search_id text,
  query_text text not null,
  query_hash text not null,
  status text not null default 'draft',
  last_synced_at timestamptz,
  last_run_id uuid references public.aifund_intelligence_runs(id) on delete set null,
  result_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists aifund_harmonic_companies_user_company_idx
  on public.aifund_harmonic_companies (user_id, harmonic_company_id);

create index if not exists aifund_harmonic_companies_harmonic_company_idx
  on public.aifund_harmonic_companies (harmonic_company_id);

create unique index if not exists aifund_harmonic_saved_searches_saved_search_idx
  on public.aifund_harmonic_saved_searches (user_id, concept_id, harmonic_saved_search_id)
  where harmonic_saved_search_id is not null;

create unique index if not exists aifund_harmonic_saved_searches_query_hash_idx
  on public.aifund_harmonic_saved_searches (user_id, concept_id, query_hash)
  where harmonic_saved_search_id is null;

create index if not exists aifund_external_profiles_harmonic_lookup_idx
  on public.aifund_external_profiles (person_id, platform, profile_url);

alter table public.aifund_harmonic_companies enable row level security;
alter table public.aifund_harmonic_saved_searches enable row level security;

drop policy if exists "aifund_harmonic_companies_select_own" on public.aifund_harmonic_companies;
create policy "aifund_harmonic_companies_select_own"
  on public.aifund_harmonic_companies
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "aifund_harmonic_saved_searches_select_own" on public.aifund_harmonic_saved_searches;
create policy "aifund_harmonic_saved_searches_select_own"
  on public.aifund_harmonic_saved_searches
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "aifund_harmonic_saved_searches_insert_own" on public.aifund_harmonic_saved_searches;
create policy "aifund_harmonic_saved_searches_insert_own"
  on public.aifund_harmonic_saved_searches
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "aifund_harmonic_saved_searches_update_own" on public.aifund_harmonic_saved_searches;
create policy "aifund_harmonic_saved_searches_update_own"
  on public.aifund_harmonic_saved_searches
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "aifund_harmonic_saved_searches_delete_own" on public.aifund_harmonic_saved_searches;
create policy "aifund_harmonic_saved_searches_delete_own"
  on public.aifund_harmonic_saved_searches
  for delete
  to authenticated
  using (auth.uid() = user_id);
