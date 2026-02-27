
-- Create settings key-value table
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (matches existing pattern)
CREATE POLICY "Allow public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update settings" ON public.settings FOR UPDATE USING (true);

-- Add tags column to pipeline
ALTER TABLE public.pipeline ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
