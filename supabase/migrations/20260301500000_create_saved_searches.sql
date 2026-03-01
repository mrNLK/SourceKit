-- FEAT-006: Saved search queries (bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  query text NOT NULL,
  expanded_query text,
  filters jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON public.saved_searches(created_at DESC);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_searches_public_read" ON public.saved_searches FOR SELECT USING (true);
CREATE POLICY "saved_searches_public_insert" ON public.saved_searches FOR INSERT WITH CHECK (true);
CREATE POLICY "saved_searches_public_delete" ON public.saved_searches FOR DELETE USING (true);
