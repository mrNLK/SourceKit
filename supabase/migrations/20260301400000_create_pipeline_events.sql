-- FEAT-005: Pipeline events table for stage change audit trail + webhook notifications
CREATE TABLE IF NOT EXISTS public.pipeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES public.pipeline(id) ON DELETE CASCADE,
  github_username text NOT NULL,
  candidate_name text,
  from_stage text,
  to_stage text NOT NULL,
  event_type text NOT NULL DEFAULT 'stage_change',
  webhook_status text, -- 'sent', 'failed', 'skipped'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_events_pipeline_id ON public.pipeline_events(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_created_at ON public.pipeline_events(created_at DESC);

ALTER TABLE public.pipeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_events_public_read" ON public.pipeline_events FOR SELECT USING (true);
CREATE POLICY "pipeline_events_public_insert" ON public.pipeline_events FOR INSERT WITH CHECK (true);
