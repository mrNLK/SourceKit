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


-- 2. Pipeline (kanban board) — user-scoped
CREATE TABLE public.pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  github_username TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  stage TEXT NOT NULL DEFAULT 'contacted' CHECK (stage IN ('contacted', 'not_interested', 'recruiter_screen', 'rejected', 'moved_to_ats')),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, github_username)
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

CREATE TRIGGER update_pipeline_updated_at
  BEFORE UPDATE ON public.pipeline
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3. Outreach history — user-scoped
CREATE TABLE public.outreach_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES public.pipeline(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_history_user_id ON public.outreach_history(user_id);

ALTER TABLE public.outreach_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own outreach" ON public.outreach_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own outreach" ON public.outreach_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own outreach" ON public.outreach_history FOR DELETE USING (auth.uid() = user_id);


-- 4. Search history — user-scoped
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
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


-- 5. Search results junction table — user-scoped
CREATE TABLE public.search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_id UUID NOT NULL,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL DEFAULT 0,
  score INTEGER,
  summary TEXT,
  about TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(search_id, candidate_id)
);

CREATE INDEX idx_search_results_user_id ON public.search_results(user_id);
CREATE INDEX idx_search_results_search_id ON public.search_results(search_id);

ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own search_results" ON public.search_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role insert search_results" ON public.search_results FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role update search_results" ON public.search_results FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service role delete search_results" ON public.search_results FOR DELETE USING (auth.role() = 'service_role');


-- 6. Watchlist items — user-scoped
CREATE TABLE public.watchlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  candidate_username TEXT NOT NULL,
  candidate_name TEXT,
  candidate_avatar_url TEXT,
  list_name TEXT NOT NULL DEFAULT 'Default',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, candidate_username, list_name)
);

CREATE INDEX idx_watchlist_items_candidate_username ON public.watchlist_items(candidate_username);
CREATE INDEX idx_watchlist_items_user_id ON public.watchlist_items(user_id);

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own watchlist" ON public.watchlist_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own watchlist" ON public.watchlist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own watchlist" ON public.watchlist_items FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users update own watchlist" ON public.watchlist_items FOR UPDATE USING (auth.uid() = user_id);


-- 7. Saved searches — user-scoped
CREATE TABLE public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  expanded_query TEXT,
  filters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_searches_user_id ON public.saved_searches(user_id);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own saved_searches" ON public.saved_searches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own saved_searches" ON public.saved_searches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own saved_searches" ON public.saved_searches FOR DELETE USING (auth.uid() = user_id);


-- 8. Pipeline events — user-scoped
CREATE TABLE public.pipeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  pipeline_id UUID REFERENCES public.pipeline(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  candidate_name TEXT,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'stage_change',
  webhook_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_events_user_id ON public.pipeline_events(user_id);

ALTER TABLE public.pipeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own pipeline_events" ON public.pipeline_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pipeline_events" ON public.pipeline_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role all pipeline_events" ON public.pipeline_events FOR ALL USING (auth.role() = 'service_role');


-- 9. Settings (key-value store) — already user-scoped via user_id
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_settings_key ON public.settings(key);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update settings" ON public.settings FOR UPDATE USING (true);

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 10. User subscriptions (for Stripe gating)
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


-- 11. Atomic search increment RPC
CREATE OR REPLACE FUNCTION increment_searches_used(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_subscriptions
  SET searches_used = searches_used + 1, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;
