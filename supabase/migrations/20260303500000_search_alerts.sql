-- F5: Search alerts and notifications

ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS alert_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS alert_frequency TEXT DEFAULT 'daily';
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS last_alert_run TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.search_alert_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id UUID NOT NULL REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  candidate_username TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(saved_search_id, candidate_username)
);

ALTER TABLE public.search_alert_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full alert_results" ON public.search_alert_results FOR ALL USING (auth.role() = 'service_role');

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
CREATE POLICY "Service role full notifications" ON public.notifications FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;
