-- FEAT-004: Add tags column to pipeline table
ALTER TABLE public.pipeline ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
