-- BUG-001: Junction table linking search_history entries to the candidates they returned.
-- Enables history replay to load cached results instead of re-firing the github-search edge function.

CREATE TABLE IF NOT EXISTS public.search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  rank integer NOT NULL DEFAULT 0,
  score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(search_id, candidate_id)
);

-- No FK on search_id: edge function inserts junction rows before frontend inserts search_history row.
-- The UUID link is managed application-side.

CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON public.search_results(search_id);
CREATE INDEX IF NOT EXISTS idx_search_results_candidate_id ON public.search_results(candidate_id);

ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read search_results') THEN
    CREATE POLICY "Allow public read search_results" ON public.search_results FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert search_results') THEN
    CREATE POLICY "Allow public insert search_results" ON public.search_results FOR INSERT WITH CHECK (true);
  END IF;
END $$;
