
CREATE TABLE IF NOT EXISTS public.search_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query text NOT NULL,
  action_type text NOT NULL DEFAULT 'search',
  result_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read search_history') THEN
CREATE POLICY "Allow public read search_history" ON public.search_history FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert search_history') THEN
CREATE POLICY "Allow public insert search_history" ON public.search_history FOR INSERT WITH CHECK (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public delete search_history') THEN
CREATE POLICY "Allow public delete search_history" ON public.search_history FOR DELETE USING (true);
END IF; END $$;
