
CREATE TABLE public.outreach_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE CASCADE,
  pipeline_id uuid REFERENCES public.pipeline(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read outreach_history" ON public.outreach_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert outreach_history" ON public.outreach_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete outreach_history" ON public.outreach_history FOR DELETE USING (true);
