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


-- 2. Pipeline (kanban board)
CREATE TABLE public.pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  github_username TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  stage TEXT NOT NULL DEFAULT 'sourced' CHECK (stage IN ('sourced', 'contacted', 'responded', 'screen', 'in_process')),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_github_username ON public.pipeline(github_username);
CREATE INDEX idx_pipeline_stage ON public.pipeline(stage);
CREATE INDEX idx_pipeline_tags ON public.pipeline USING GIN (tags);
CREATE INDEX idx_pipeline_created_at ON public.pipeline(created_at DESC);

ALTER TABLE public.pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read pipeline" ON public.pipeline FOR SELECT USING (true);
CREATE POLICY "Allow public insert pipeline" ON public.pipeline FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update pipeline" ON public.pipeline FOR UPDATE USING (true);
CREATE POLICY "Allow public delete pipeline" ON public.pipeline FOR DELETE USING (true);

CREATE TRIGGER update_pipeline_updated_at
  BEFORE UPDATE ON public.pipeline
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3. Outreach history
CREATE TABLE public.outreach_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES public.pipeline(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read outreach_history" ON public.outreach_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert outreach_history" ON public.outreach_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete outreach_history" ON public.outreach_history FOR DELETE USING (true);


-- 4. Search history
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'search',
  result_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_history_created_at ON public.search_history(created_at DESC);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read search_history" ON public.search_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert search_history" ON public.search_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete search_history" ON public.search_history FOR DELETE USING (true);


-- 5. Watchlist items
CREATE TABLE public.watchlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_username TEXT NOT NULL,
  candidate_name TEXT,
  candidate_avatar_url TEXT,
  list_name TEXT NOT NULL DEFAULT 'Default',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_username, list_name)
);

CREATE INDEX idx_watchlist_items_candidate_username ON public.watchlist_items(candidate_username);

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read watchlist_items" ON public.watchlist_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert watchlist_items" ON public.watchlist_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete watchlist_items" ON public.watchlist_items FOR DELETE USING (true);
CREATE POLICY "Allow public update watchlist_items" ON public.watchlist_items FOR UPDATE USING (true);


-- 6. Settings (key-value store)
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
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
