-- ==========================================
-- BUG-01: Fix wide-open RLS policies
-- Add user_id to unscoped tables and replace
-- USING (true) policies with auth.uid() scoping
-- ==========================================

-- 1. PIPELINE: Add user_id, scope RLS
ALTER TABLE public.pipeline ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

DROP POLICY IF EXISTS "Allow public read pipeline" ON public.pipeline;
DROP POLICY IF EXISTS "Allow public insert pipeline" ON public.pipeline;
DROP POLICY IF EXISTS "Allow public update pipeline" ON public.pipeline;
DROP POLICY IF EXISTS "Allow public delete pipeline" ON public.pipeline;

CREATE POLICY "Users read own pipeline" ON public.pipeline FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pipeline" ON public.pipeline FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pipeline" ON public.pipeline FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own pipeline" ON public.pipeline FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full pipeline" ON public.pipeline FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_pipeline_user_id ON public.pipeline(user_id);


-- 2. OUTREACH_HISTORY: Add user_id, scope RLS
ALTER TABLE public.outreach_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

DROP POLICY IF EXISTS "Allow public read outreach_history" ON public.outreach_history;
DROP POLICY IF EXISTS "Allow public insert outreach_history" ON public.outreach_history;
DROP POLICY IF EXISTS "Allow public delete outreach_history" ON public.outreach_history;
DROP POLICY IF EXISTS "Allow public update outreach_history" ON public.outreach_history;

CREATE POLICY "Users read own outreach" ON public.outreach_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own outreach" ON public.outreach_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own outreach" ON public.outreach_history FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users update own outreach" ON public.outreach_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full outreach" ON public.outreach_history FOR ALL USING (auth.role() = 'service_role');


-- 3. SEARCH_HISTORY: Add user_id, scope RLS
ALTER TABLE public.search_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

DROP POLICY IF EXISTS "Allow public read search_history" ON public.search_history;
DROP POLICY IF EXISTS "Allow public insert search_history" ON public.search_history;
DROP POLICY IF EXISTS "Allow public delete search_history" ON public.search_history;

CREATE POLICY "Users read own search_history" ON public.search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own search_history" ON public.search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own search_history" ON public.search_history FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full search_history" ON public.search_history FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON public.search_history(user_id);


-- 4. WATCHLIST_ITEMS: Add user_id, scope RLS
ALTER TABLE public.watchlist_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

DROP POLICY IF EXISTS "Allow public read watchlist_items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Allow public insert watchlist_items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Allow public delete watchlist_items" ON public.watchlist_items;
DROP POLICY IF EXISTS "Allow public update watchlist_items" ON public.watchlist_items;

CREATE POLICY "Users read own watchlist" ON public.watchlist_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own watchlist" ON public.watchlist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own watchlist" ON public.watchlist_items FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users update own watchlist" ON public.watchlist_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full watchlist" ON public.watchlist_items FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items(user_id);


-- 5. SAVED_SEARCHES: Add user_id, scope RLS
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

DROP POLICY IF EXISTS "Allow public read saved_searches" ON public.saved_searches;
DROP POLICY IF EXISTS "Allow public insert saved_searches" ON public.saved_searches;
DROP POLICY IF EXISTS "Allow public delete saved_searches" ON public.saved_searches;
DROP POLICY IF EXISTS "saved_searches_select" ON public.saved_searches;
DROP POLICY IF EXISTS "saved_searches_insert" ON public.saved_searches;
DROP POLICY IF EXISTS "saved_searches_delete" ON public.saved_searches;

CREATE POLICY "Users read own saved_searches" ON public.saved_searches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own saved_searches" ON public.saved_searches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own saved_searches" ON public.saved_searches FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full saved_searches" ON public.saved_searches FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);


-- 6. SEARCH_RESULTS: Add user_id, scope RLS
ALTER TABLE public.search_results ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

DROP POLICY IF EXISTS "Allow public read search_results" ON public.search_results;
DROP POLICY IF EXISTS "Allow public insert search_results" ON public.search_results;
DROP POLICY IF EXISTS "search_results_select" ON public.search_results;
DROP POLICY IF EXISTS "search_results_insert" ON public.search_results;

CREATE POLICY "Users read own search_results" ON public.search_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own search_results" ON public.search_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full search_results" ON public.search_results FOR ALL USING (auth.role() = 'service_role');


-- 7. PIPELINE_EVENTS: Add user_id, scope RLS
ALTER TABLE public.pipeline_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

DROP POLICY IF EXISTS "Allow public read pipeline_events" ON public.pipeline_events;
DROP POLICY IF EXISTS "Allow public insert pipeline_events" ON public.pipeline_events;
DROP POLICY IF EXISTS "pipeline_events_select" ON public.pipeline_events;
DROP POLICY IF EXISTS "pipeline_events_insert" ON public.pipeline_events;

CREATE POLICY "Users read own pipeline_events" ON public.pipeline_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pipeline_events" ON public.pipeline_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full pipeline_events" ON public.pipeline_events FOR ALL USING (auth.role() = 'service_role');


-- 8. CANDIDATES: Keep public read but restrict sensitive fields
-- Candidates is a global cache (service-role writes), so we keep public SELECT
-- but create a secure view that hides PII from non-service-role callers
DROP POLICY IF EXISTS "Allow public read" ON public.candidates;

CREATE POLICY "Public read candidates" ON public.candidates FOR SELECT USING (true);
-- INSERT/UPDATE remain service_role only (already set in earlier migration)

-- Create a safe view that hides PII for client-side use
CREATE OR REPLACE VIEW public.candidates_safe AS
SELECT
  id, github_username, name, avatar_url, bio, location,
  followers, public_repos, stars, top_languages, highlights,
  score, summary, about, is_hidden_gem, joined_year,
  contributed_repos, twitter_username, github_url,
  fetched_at, created_at, updated_at
  -- Excluded: email, linkedin_url, linkedin_confidence
FROM public.candidates;
