
-- Create settings key-value table
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (matches existing pattern)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read settings') THEN
CREATE POLICY "Allow public read settings" ON public.settings FOR SELECT USING (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert settings') THEN
CREATE POLICY "Allow public insert settings" ON public.settings FOR INSERT WITH CHECK (true);
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public update settings') THEN
CREATE POLICY "Allow public update settings" ON public.settings FOR UPDATE USING (true);
END IF; END $$;

-- Add tags column to pipeline
ALTER TABLE public.pipeline ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
