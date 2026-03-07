-- Harmonic company cache: normalized columns for fast queries + raw payload for flexibility.
-- Cache TTL is enforced at the application layer (7 days default).

create table if not exists public.company_cache (
  id uuid primary key default gen_random_uuid(),
  harmonic_company_id text unique,
  name text,
  domain text,
  website_url text,
  linkedin_url text,
  location text,
  funding_stage text,
  funding_total numeric,
  last_funding_date timestamptz,
  last_funding_total numeric,
  headcount integer,
  headcount_growth_30d numeric,
  headcount_growth_90d numeric,
  headcount_growth_180d numeric,
  web_traffic jsonb null,
  investors jsonb,
  founders jsonb,
  industry_tags text[],
  technology_tags text[],
  customer_tags text[],
  company_quality jsonb,
  raw_payload jsonb,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_cache_domain on public.company_cache (domain);
create index if not exists idx_company_cache_harmonic_id on public.company_cache (harmonic_company_id);

-- RLS: service role writes, authenticated users can read
alter table public.company_cache enable row level security;

create policy "Authenticated users can read company_cache"
  on public.company_cache for select
  using (auth.role() = 'authenticated' or auth.role() = 'service_role');

create policy "Service role can manage company_cache"
  on public.company_cache for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Add Harmonic link fields to candidates table
alter table public.candidates
  add column if not exists harmonic_company_id text null,
  add column if not exists company_enriched_at timestamptz null;

-- Harmonic saved searches for monitoring
create table if not exists public.harmonic_saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  query text not null,
  harmonic_saved_search_id text,
  status text not null default 'active',
  scope text, -- e.g. 'competitors', 'sector', 'headcount_band'
  last_polled_at timestamptz,
  last_seen_cursor text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.harmonic_saved_searches enable row level security;

create policy "Users can manage their own harmonic saved searches"
  on public.harmonic_saved_searches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
