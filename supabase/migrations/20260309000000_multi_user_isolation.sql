-- ============================================================================
-- Multi-user data isolation
--
-- Adds user_id to 7 tables so each user's pipeline, history, watchlist, etc.
-- is private. Also adds summary/about to search_results so per-search AI
-- commentary is preserved (fixes score-clobbering across concurrent users).
-- ============================================================================

-- Ensure tables exist (they may have been created by remote-only migrations
-- that are no longer tracked locally).
CREATE TABLE IF NOT EXISTS public.search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  rank integer NOT NULL DEFAULT 0,
  score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(search_id, candidate_id)
);
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON public.search_results(search_id);

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  query text NOT NULL,
  expanded_query text,
  filters jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pipeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES public.pipeline(id) ON DELETE CASCADE,
  github_username text NOT NULL,
  candidate_name text,
  from_stage text,
  to_stage text NOT NULL,
  event_type text NOT NULL DEFAULT 'stage_change',
  webhook_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline_events ENABLE ROW LEVEL SECURITY;

-- Helper: grab the first existing user to backfill legacy rows.
-- If no users exist yet the UPDATE is a no-op (0 rows affected).
DO $$ DECLARE _first_user UUID; BEGIN
  SELECT id INTO _first_user FROM auth.users ORDER BY created_at LIMIT 1;

  -- -----------------------------------------------------------------------
  -- 1. pipeline
  -- -----------------------------------------------------------------------
  ALTER TABLE public.pipeline ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  IF _first_user IS NOT NULL THEN
    UPDATE public.pipeline SET user_id = _first_user WHERE user_id IS NULL;
  END IF;
  ALTER TABLE public.pipeline ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE public.pipeline ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- Replace global unique with per-user unique
  ALTER TABLE public.pipeline DROP CONSTRAINT IF EXISTS pipeline_github_username_key;
  ALTER TABLE public.pipeline ADD CONSTRAINT pipeline_user_github_unique UNIQUE (user_id, github_username);

  -- -----------------------------------------------------------------------
  -- 2. search_history
  -- -----------------------------------------------------------------------
  ALTER TABLE public.search_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  IF _first_user IS NOT NULL THEN
    UPDATE public.search_history SET user_id = _first_user WHERE user_id IS NULL;
  END IF;
  ALTER TABLE public.search_history ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE public.search_history ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- -----------------------------------------------------------------------
  -- 3. search_results  (also add summary + about for score-clobber fix)
  -- -----------------------------------------------------------------------
  ALTER TABLE public.search_results ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE public.search_results ADD COLUMN IF NOT EXISTS summary TEXT;
  ALTER TABLE public.search_results ADD COLUMN IF NOT EXISTS about TEXT;
  IF _first_user IS NOT NULL THEN
    UPDATE public.search_results SET user_id = _first_user WHERE user_id IS NULL;
  END IF;
  ALTER TABLE public.search_results ALTER COLUMN user_id SET NOT NULL;
  -- No DEFAULT auth.uid() here — edge function (service_role) inserts explicitly.

  -- -----------------------------------------------------------------------
  -- 4. watchlist_items
  -- -----------------------------------------------------------------------
  ALTER TABLE public.watchlist_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  IF _first_user IS NOT NULL THEN
    UPDATE public.watchlist_items SET user_id = _first_user WHERE user_id IS NULL;
  END IF;
  ALTER TABLE public.watchlist_items ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE public.watchlist_items ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- Replace global unique with per-user unique
  ALTER TABLE public.watchlist_items DROP CONSTRAINT IF EXISTS watchlist_items_candidate_username_list_name_key;
  ALTER TABLE public.watchlist_items ADD CONSTRAINT watchlist_user_candidate_list_unique UNIQUE (user_id, candidate_username, list_name);

  -- -----------------------------------------------------------------------
  -- 5. outreach_history
  -- -----------------------------------------------------------------------
  ALTER TABLE public.outreach_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  IF _first_user IS NOT NULL THEN
    UPDATE public.outreach_history SET user_id = _first_user WHERE user_id IS NULL;
  END IF;
  ALTER TABLE public.outreach_history ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE public.outreach_history ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- -----------------------------------------------------------------------
  -- 6. saved_searches
  -- -----------------------------------------------------------------------
  ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  IF _first_user IS NOT NULL THEN
    UPDATE public.saved_searches SET user_id = _first_user WHERE user_id IS NULL;
  END IF;
  ALTER TABLE public.saved_searches ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE public.saved_searches ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- -----------------------------------------------------------------------
  -- 7. pipeline_events
  -- -----------------------------------------------------------------------
  ALTER TABLE public.pipeline_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  IF _first_user IS NOT NULL THEN
    UPDATE public.pipeline_events SET user_id = _first_user WHERE user_id IS NULL;
  END IF;
  ALTER TABLE public.pipeline_events ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE public.pipeline_events ALTER COLUMN user_id SET DEFAULT auth.uid();

END $$;


-- =========================================================================
-- RLS policy replacements
-- =========================================================================

-- Helper macro: for each table, drop old permissive policies, create
-- user-scoped ones. Pattern: auth.uid() = user_id for all CRUD.

-- ----- pipeline -----
DROP POLICY IF EXISTS "Allow public read pipeline" ON public.pipeline;
DROP POLICY IF EXISTS "Allow public insert pipeline" ON public.pipeline;
DROP POLICY IF EXISTS "Allow public update pipeline" ON public.pipeline;
DROP POLICY IF EXISTS "Allow public delete pipeline" ON public.pipeline;

CREATE POLICY "pipeline_user_select" ON public.pipeline FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pipeline_user_insert" ON public.pipeline FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pipeline_user_update" ON public.pipeline FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pipeline_user_delete" ON public.pipeline FOR DELETE USING (auth.uid() = user_id);

-- ----- search_history -----
DROP POLICY IF EXISTS "Allow public read search_history" ON public.search_history;
DROP POLICY IF EXISTS "Allow public insert search_history" ON public.search_history;
DROP POLICY IF EXISTS "Allow public delete search_history" ON public.search_history;

CREATE POLICY "search_history_user_select" ON public.search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "search_history_user_insert" ON public.search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "search_history_user_delete" ON public.search_history FOR DELETE USING (auth.uid() = user_id);

-- ----- search_results (edge function uses service_role to insert) -----
DROP POLICY IF EXISTS "Allow public read search_results" ON public.search_results;
DROP POLICY IF EXISTS "Allow public insert search_results" ON public.search_results;

CREATE POLICY "search_results_user_select" ON public.search_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "search_results_service_insert" ON public.search_results FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "search_results_service_select" ON public.search_results FOR SELECT USING (auth.role() = 'service_role');

-- ----- watchlist_items -----
DROP POLICY IF EXISTS "Allow public read watchlist_items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Allow public insert watchlist_items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Allow public update watchlist_items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Allow public delete watchlist_items" ON public.watchlist_items;

CREATE POLICY "watchlist_user_select" ON public.watchlist_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "watchlist_user_insert" ON public.watchlist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlist_user_update" ON public.watchlist_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "watchlist_user_delete" ON public.watchlist_items FOR DELETE USING (auth.uid() = user_id);

-- ----- outreach_history -----
DROP POLICY IF EXISTS "Allow public read outreach_history" ON public.outreach_history;
DROP POLICY IF EXISTS "Allow public insert outreach_history" ON public.outreach_history;
DROP POLICY IF EXISTS "Allow public delete outreach_history" ON public.outreach_history;

CREATE POLICY "outreach_user_select" ON public.outreach_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "outreach_user_insert" ON public.outreach_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outreach_user_delete" ON public.outreach_history FOR DELETE USING (auth.uid() = user_id);

-- ----- saved_searches -----
DROP POLICY IF EXISTS "saved_searches_public_read" ON public.saved_searches;
DROP POLICY IF EXISTS "saved_searches_public_insert" ON public.saved_searches;
DROP POLICY IF EXISTS "saved_searches_public_delete" ON public.saved_searches;

CREATE POLICY "saved_searches_user_select" ON public.saved_searches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_searches_user_insert" ON public.saved_searches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_searches_user_delete" ON public.saved_searches FOR DELETE USING (auth.uid() = user_id);

-- ----- pipeline_events -----
DROP POLICY IF EXISTS "pipeline_events_public_read" ON public.pipeline_events;
DROP POLICY IF EXISTS "pipeline_events_public_insert" ON public.pipeline_events;

CREATE POLICY "pipeline_events_user_select" ON public.pipeline_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pipeline_events_user_insert" ON public.pipeline_events FOR INSERT WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- Indexes on new user_id columns
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_pipeline_user_id ON public.pipeline(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_results_user_id ON public.search_results(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_history_user_id ON public.outreach_history(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_user_id ON public.pipeline_events(user_id);
