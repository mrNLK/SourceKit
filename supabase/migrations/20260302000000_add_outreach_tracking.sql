-- F9: Add sent tracking columns to outreach_history
ALTER TABLE public.outreach_history
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- Allow updates for sent tracking
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public update outreach_history') THEN
CREATE POLICY "Allow public update outreach_history" ON public.outreach_history FOR UPDATE USING (true) WITH CHECK (true);
END IF; END $$;
