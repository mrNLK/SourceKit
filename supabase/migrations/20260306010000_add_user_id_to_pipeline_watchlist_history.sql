-- Add user_id to pipeline, watchlist_items, and search_history for multi-tenant isolation.
-- These tables previously had public RLS policies allowing any user to read/modify all data.

-- =============================================
-- 1. PIPELINE — add user_id + tighten RLS
-- =============================================
ALTER TABLE public.pipeline
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_pipeline_user_id ON public.pipeline(user_id);

-- Replace overly permissive policies
DROP POLICY IF EXISTS "Allow public read pipeline" ON public.pipeline;
DROP POLICY IF EXISTS "Allow public insert pipeline" ON public.pipeline;
DROP POLICY IF EXISTS "Allow public update pipeline" ON public.pipeline;
DROP POLICY IF EXISTS "Allow public delete pipeline" ON public.pipeline;

CREATE POLICY "Users can read own pipeline"
  ON public.pipeline FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pipeline"
  ON public.pipeline FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pipeline"
  ON public.pipeline FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pipeline"
  ON public.pipeline FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass for edge functions
CREATE POLICY "Service role full access pipeline"
  ON public.pipeline FOR ALL
  USING (auth.role() = 'service_role');


-- =============================================
-- 2. WATCHLIST_ITEMS — add user_id + tighten RLS
-- =============================================
ALTER TABLE public.watchlist_items
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items(user_id);

DROP POLICY IF EXISTS "Allow public read watchlist_items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Allow public insert watchlist_items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Allow public delete watchlist_items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Allow public update watchlist_items" ON public.watchlist_items;

CREATE POLICY "Users can read own watchlist"
  ON public.watchlist_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist"
  ON public.watchlist_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist"
  ON public.watchlist_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist"
  ON public.watchlist_items FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access watchlist"
  ON public.watchlist_items FOR ALL
  USING (auth.role() = 'service_role');


-- =============================================
-- 3. SEARCH_HISTORY — add user_id + tighten RLS
-- =============================================
ALTER TABLE public.search_history
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON public.search_history(user_id);

DROP POLICY IF EXISTS "Allow public read search_history" ON public.search_history;
DROP POLICY IF EXISTS "Allow public insert search_history" ON public.search_history;
DROP POLICY IF EXISTS "Allow public delete search_history" ON public.search_history;

CREATE POLICY "Users can read own search_history"
  ON public.search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search_history"
  ON public.search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search_history"
  ON public.search_history FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access search_history"
  ON public.search_history FOR ALL
  USING (auth.role() = 'service_role');


-- =============================================
-- 4. PIPELINE_EVENTS — tighten RLS
-- =============================================
DROP POLICY IF EXISTS "pipeline_events_public_read" ON public.pipeline_events;
DROP POLICY IF EXISTS "pipeline_events_public_insert" ON public.pipeline_events;

ALTER TABLE public.pipeline_events
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Users can read own pipeline_events"
  ON public.pipeline_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access pipeline_events"
  ON public.pipeline_events FOR ALL
  USING (auth.role() = 'service_role');


-- =============================================
-- 5. OUTREACH_HISTORY — tighten RLS
-- =============================================
ALTER TABLE public.outreach_history
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Allow public read outreach_history" ON public.outreach_history;
DROP POLICY IF EXISTS "Allow public insert outreach_history" ON public.outreach_history;
DROP POLICY IF EXISTS "Allow public delete outreach_history" ON public.outreach_history;

CREATE POLICY "Users can read own outreach"
  ON public.outreach_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own outreach"
  ON public.outreach_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own outreach"
  ON public.outreach_history FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access outreach"
  ON public.outreach_history FOR ALL
  USING (auth.role() = 'service_role');
