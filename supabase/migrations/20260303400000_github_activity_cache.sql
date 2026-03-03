-- F4: Cache for GitHub activity data (heatmap/timeline)
CREATE TABLE IF NOT EXISTS public.github_activity_cache (
  github_username TEXT PRIMARY KEY,
  contribution_data JSONB NOT NULL DEFAULT '{}',
  activity_score INTEGER DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.github_activity_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read activity cache" ON public.github_activity_cache FOR SELECT USING (true);
CREATE POLICY "Service role write activity cache" ON public.github_activity_cache FOR ALL USING (auth.role() = 'service_role');
