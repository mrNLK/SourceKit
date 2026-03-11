-- Enable realtime for pipeline table
ALTER TABLE public.pipeline REPLICA IDENTITY FULL;

-- Add updated_at trigger if not already present
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Enable realtime publication (safe to re-add)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'pipeline'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline;
  END IF;
END $$;
