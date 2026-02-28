
-- Pipeline table for kanban board
CREATE TABLE IF NOT EXISTS public.pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  github_username TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  stage TEXT NOT NULL DEFAULT 'sourced' CHECK (stage IN ('sourced', 'contacted', 'responded', 'screen', 'offer')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(github_username)
);

ALTER TABLE public.pipeline ENABLE ROW LEVEL SECURITY;

-- Public read/write for now (no auth in this app)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read pipeline') THEN
CREATE POLICY "Allow public read pipeline" ON public.pipeline FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert pipeline') THEN
CREATE POLICY "Allow public insert pipeline" ON public.pipeline FOR INSERT WITH CHECK (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public update pipeline') THEN
CREATE POLICY "Allow public update pipeline" ON public.pipeline FOR UPDATE USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public delete pipeline') THEN
CREATE POLICY "Allow public delete pipeline" ON public.pipeline FOR DELETE USING (true);
END IF; END $$;

CREATE TRIGGER update_pipeline_updated_at
  BEFORE UPDATE ON public.pipeline
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
