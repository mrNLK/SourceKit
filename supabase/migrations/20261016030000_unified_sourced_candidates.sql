-- Unified multi-source candidates (Exa people, Parallel, GitHub, Websets, Harmonic; Airscale email enrichment).
-- Separate from the legacy GitHub-keyed public.candidates cache, which is unchanged.

CREATE TABLE IF NOT EXISTS public.sourced_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  headline TEXT,
  current_title TEXT,
  current_company TEXT,
  company_domain TEXT,
  location TEXT,
  linkedin_url TEXT,
  linkedin_slug TEXT,
  github_login TEXT,
  harmonic_urn TEXT,
  emails TEXT[] NOT NULL DEFAULT '{}',
  email_provider TEXT,
  email_status TEXT,
  email_checked_at TIMESTAMPTZ,
  profile_urls TEXT[] NOT NULL DEFAULT '{}',
  summary TEXT,
  avatar_url TEXT,
  providers TEXT[] NOT NULL DEFAULT '{}',
  sourcing_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hard identities are unique per user (dedup keys).
CREATE UNIQUE INDEX IF NOT EXISTS sourced_candidates_user_linkedin_uq ON public.sourced_candidates (user_id, linkedin_slug) WHERE linkedin_slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sourced_candidates_user_github_uq ON public.sourced_candidates (user_id, github_login) WHERE github_login IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sourced_candidates_user_harmonic_uq ON public.sourced_candidates (user_id, harmonic_urn) WHERE harmonic_urn IS NOT NULL;
CREATE INDEX IF NOT EXISTS sourced_candidates_emails_gin ON public.sourced_candidates USING gin (emails);
CREATE INDEX IF NOT EXISTS sourced_candidates_user_updated ON public.sourced_candidates (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.candidate_source_hits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.sourced_candidates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT,
  url TEXT,
  rank INTEGER,
  raw_score DOUBLE PRECISION,
  snippet TEXT,
  query TEXT,
  sourcing_run_id UUID,
  est_cost_usd NUMERIC(10,5),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS candidate_source_hits_candidate ON public.candidate_source_hits (candidate_id);
CREATE INDEX IF NOT EXISTS candidate_source_hits_user_provider ON public.candidate_source_hits (user_id, provider, fetched_at DESC);

-- Async "deep search" runs (Parallel FindAll / Exa Websets).
CREATE TABLE IF NOT EXISTS public.sourcing_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('parallel_findall', 'exa_webset')),
  external_run_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  match_limit INTEGER,
  result_count INTEGER NOT NULL DEFAULT 0,
  est_cost_usd NUMERIC(10,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, external_run_id)
);
CREATE INDEX IF NOT EXISTS sourcing_runs_user_created ON public.sourcing_runs (user_id, created_at DESC);

ALTER TABLE public.sourced_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_source_hits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sourcing_runs ENABLE ROW LEVEL SECURITY;

-- Owners can read their own rows; writes go through edge functions (service role).
DROP POLICY IF EXISTS "sourced_candidates_owner_select" ON public.sourced_candidates;
CREATE POLICY "sourced_candidates_owner_select" ON public.sourced_candidates FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "sourced_candidates_owner_delete" ON public.sourced_candidates;
CREATE POLICY "sourced_candidates_owner_delete" ON public.sourced_candidates FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "candidate_source_hits_owner_select" ON public.candidate_source_hits;
CREATE POLICY "candidate_source_hits_owner_select" ON public.candidate_source_hits FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "sourcing_runs_owner_select" ON public.sourcing_runs;
CREATE POLICY "sourcing_runs_owner_select" ON public.sourcing_runs FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.sourced_candidates, public.candidate_source_hits, public.sourcing_runs FROM anon;
GRANT SELECT, DELETE ON public.sourced_candidates TO authenticated;
GRANT SELECT ON public.candidate_source_hits, public.sourcing_runs TO authenticated;
