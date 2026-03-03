-- ==========================================
-- SourceKit Full Schema (consolidated)
-- Run this in Supabase Dashboard → SQL Editor
-- ==========================================

-- 1. Candidates cache table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  github_username TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  followers INTEGER DEFAULT 0,
  public_repos INTEGER DEFAULT 0,
  stars INTEGER DEFAULT 0,
  top_languages JSONB DEFAULT '[]'::jsonb,
  highlights TEXT[] DEFAULT '{}',
  score INTEGER DEFAULT 0,
  summary TEXT,
  about TEXT,
  is_hidden_gem BOOLEAN DEFAULT false,
  joined_year INTEGER,
  contributed_repos JSONB DEFAULT '{}'::jsonb,
  linkedin_url TEXT,
  linkedin_confidence TEXT,
  twitter_username TEXT,
  email TEXT,
  github_url TEXT,
  query_hash TEXT,
  linkedin_fetched_at TIMESTAMPTZ,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidates_username ON public.candidates(github_username);
CREATE INDEX idx_candidates_fetched_at ON public.candidates(fetched_at);
CREATE INDEX idx_candidates_score ON public.candidates(score DESC NULLS LAST);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Service role insert" ON public.candidates FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role update" ON public.candidates FOR UPDATE USING (auth.role() = 'service_role');

-- Updated-at trigger function (shared)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2. Pipeline (kanban board)
CREATE TABLE public.pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  github_username TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  stage TEXT NOT NULL DEFAULT 'sourced' CHECK (stage IN ('sourced', 'contacted', 'responded', 'screen', 'offer')),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  eea_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_github_username ON public.pipeline(github_username);
CREATE INDEX idx_pipeline_stage ON public.pipeline(stage);
CREATE INDEX idx_pipeline_tags ON public.pipeline USING GIN (tags);
CREATE INDEX idx_pipeline_created_at ON public.pipeline(created_at DESC);
CREATE INDEX idx_pipeline_user_id ON public.pipeline(user_id);

ALTER TABLE public.pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own pipeline" ON public.pipeline FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pipeline" ON public.pipeline FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pipeline" ON public.pipeline FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own pipeline" ON public.pipeline FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full pipeline" ON public.pipeline FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_pipeline_updated_at
  BEFORE UPDATE ON public.pipeline
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3. Outreach history
CREATE TABLE public.outreach_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES public.pipeline(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  channel TEXT,
  status TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own outreach" ON public.outreach_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own outreach" ON public.outreach_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own outreach" ON public.outreach_history FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users update own outreach" ON public.outreach_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full outreach" ON public.outreach_history FOR ALL USING (auth.role() = 'service_role');


-- 4. Search history
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  query TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'search',
  result_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_history_created_at ON public.search_history(created_at DESC);
CREATE INDEX idx_search_history_user_id ON public.search_history(user_id);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own search_history" ON public.search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own search_history" ON public.search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own search_history" ON public.search_history FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full search_history" ON public.search_history FOR ALL USING (auth.role() = 'service_role');


-- 5. Watchlist items
CREATE TABLE public.watchlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  candidate_username TEXT NOT NULL,
  candidate_name TEXT,
  candidate_avatar_url TEXT,
  list_name TEXT NOT NULL DEFAULT 'Default',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_username, list_name)
);

CREATE INDEX idx_watchlist_items_candidate_username ON public.watchlist_items(candidate_username);
CREATE INDEX idx_watchlist_items_user_id ON public.watchlist_items(user_id);

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own watchlist" ON public.watchlist_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own watchlist" ON public.watchlist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own watchlist" ON public.watchlist_items FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users update own watchlist" ON public.watchlist_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full watchlist" ON public.watchlist_items FOR ALL USING (auth.role() = 'service_role');


-- 6. Settings (key-value store, user-scoped)
CREATE TABLE public.settings (
  user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

CREATE INDEX idx_settings_key ON public.settings(key);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own settings" ON public.settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own settings" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own settings" ON public.settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own settings" ON public.settings FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 7. User subscriptions (for Stripe gating)
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'trial',
  searches_used INTEGER NOT NULL DEFAULT 0,
  search_limit INTEGER DEFAULT 10,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_subscriptions_stripe_customer ON public.user_subscriptions(stripe_customer_id);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own subscription" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access" ON public.user_subscriptions FOR ALL USING (auth.role() = 'service_role');

-- Auto-create subscription row on signup
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id) VALUES (new.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_subscription();


-- 8. Atomic search increment RPC
CREATE OR REPLACE FUNCTION increment_searches_used(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_subscriptions
  SET searches_used = searches_used + 1, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;


-- 9. Safe view for candidates (hides PII from client-side queries)
CREATE OR REPLACE VIEW public.candidates_safe AS
SELECT
  id, github_username, name, avatar_url, bio, location,
  followers, public_repos, stars, top_languages, highlights,
  score, summary, about, is_hidden_gem, joined_year,
  contributed_repos, twitter_username, github_url,
  fetched_at, created_at, updated_at
FROM public.candidates;


-- 10. Search results (links searches to candidate rows)
CREATE TABLE IF NOT EXISTS public.search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  search_id UUID NOT NULL,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL DEFAULT 0,
  score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(search_id, candidate_id)
);

ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own search_results" ON public.search_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own search_results" ON public.search_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full search_results" ON public.search_results FOR ALL USING (auth.role() = 'service_role');


-- 11. Pipeline events (audit trail for stage changes)
CREATE TABLE IF NOT EXISTS public.pipeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  pipeline_id UUID REFERENCES public.pipeline(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  candidate_name TEXT,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'stage_change',
  webhook_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own pipeline_events" ON public.pipeline_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pipeline_events" ON public.pipeline_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full pipeline_events" ON public.pipeline_events FOR ALL USING (auth.role() = 'service_role');


-- 12. Saved searches (bookmarked queries)
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  expanded_query TEXT,
  filters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own saved_searches" ON public.saved_searches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own saved_searches" ON public.saved_searches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own saved_searches" ON public.saved_searches FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full saved_searches" ON public.saved_searches FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);


-- 13. EEA signal templates (user-created signal definitions)
CREATE TABLE IF NOT EXISTS public.eea_signal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_category TEXT NOT NULL,
  signal_name TEXT NOT NULL,
  webset_criterion TEXT NOT NULL,
  enrichment_description TEXT NOT NULL,
  enrichment_format TEXT NOT NULL DEFAULT 'text',
  enrichment_options JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.eea_signal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own templates" ON public.eea_signal_templates FOR ALL USING (auth.uid() = user_id);


-- 14. Webset refs (Exa webset tracking)
CREATE TABLE IF NOT EXISTS public.webset_refs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'running',
  eea_signals JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webset_refs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own webset_refs" ON public.webset_refs FOR ALL USING (auth.uid() = user_id);


-- 15. Webset mappings
CREATE TABLE IF NOT EXISTS public.webset_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webset_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  query TEXT,
  status TEXT DEFAULT 'running',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.webset_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own webset_mappings" ON public.webset_mappings FOR ALL USING (auth.uid() = user_id);


-- 16. Outreach sequences (automated email campaigns)
CREATE TABLE IF NOT EXISTS public.outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sequences" ON public.outreach_sequences FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_sequences_updated_at
  BEFORE UPDATE ON public.outreach_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 17. Sequence enrollments (candidate enrollment in a sequence)
CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.outreach_sequences(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.pipeline(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'replied', 'bounced')),
  next_send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sequence_id, pipeline_id)
);

ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own enrollments" ON public.sequence_enrollments FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_enrollments_next_send ON public.sequence_enrollments(next_send_at) WHERE status = 'active';
CREATE INDEX idx_sequence_enrollments_sequence_id ON public.sequence_enrollments(sequence_id);
CREATE INDEX idx_sequence_enrollments_pipeline_id ON public.sequence_enrollments(pipeline_id);

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON public.sequence_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 18. Outreach events (sent, opened, clicked, etc.)
CREATE TABLE IF NOT EXISTS public.outreach_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.sequence_enrollments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'opened', 'clicked', 'replied', 'bounced')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full outreach_events" ON public.outreach_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Users read own outreach_events" ON public.outreach_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sequence_enrollments se
      JOIN public.outreach_sequences os ON os.id = se.sequence_id
      WHERE se.id = outreach_events.enrollment_id AND os.user_id = auth.uid()
    )
  );

CREATE INDEX idx_outreach_events_enrollment_id ON public.outreach_events(enrollment_id);


-- 19. GitHub activity cache (heatmap/timeline data)
CREATE TABLE IF NOT EXISTS public.github_activity_cache (
  github_username TEXT PRIMARY KEY,
  contribution_data JSONB NOT NULL DEFAULT '{}',
  activity_score INTEGER DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.github_activity_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read activity cache" ON public.github_activity_cache FOR SELECT USING (true);
CREATE POLICY "Service role write activity cache" ON public.github_activity_cache FOR ALL USING (auth.role() = 'service_role');


-- 20. Search alerts (extends saved_searches)
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS alert_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS alert_frequency TEXT DEFAULT 'daily';
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS last_alert_run TIMESTAMPTZ;


-- 21. Search alert results (tracks new candidates per alert)
CREATE TABLE IF NOT EXISTS public.search_alert_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id UUID NOT NULL REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  candidate_username TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(saved_search_id, candidate_username)
);

ALTER TABLE public.search_alert_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full alert_results" ON public.search_alert_results FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Users read own alert_results" ON public.search_alert_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.saved_searches
      WHERE id = search_alert_results.saved_search_id AND user_id = auth.uid()
    )
  );


-- 22. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'search_alert',
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full notifications" ON public.notifications FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;


-- 23. Missing indexes on user_id and FK columns (P8)
CREATE INDEX IF NOT EXISTS idx_outreach_history_user_id ON public.outreach_history(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_history_created_at ON public.outreach_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_results_user_id ON public.search_results(user_id);
CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON public.search_results(search_id);
CREATE INDEX IF NOT EXISTS idx_search_results_candidate_id ON public.search_results(candidate_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_user_id ON public.pipeline_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_pipeline_id ON public.pipeline_events(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_created_at ON public.pipeline_events(created_at DESC);

-- Composite indexes for user-scoped time-ordered queries
CREATE INDEX IF NOT EXISTS idx_pipeline_user_created ON public.pipeline(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_user_created ON public.search_history(user_id, created_at DESC);
