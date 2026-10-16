-- Pilot fixes: first "sourced" stage for new pipeline cards, allow all UI stages,
-- and persist the AI score captured at add-time so Bulk Actions can show it.
ALTER TABLE public.pipeline ADD COLUMN IF NOT EXISTS score integer;

ALTER TABLE public.pipeline DROP CONSTRAINT IF EXISTS pipeline_stage_check;
ALTER TABLE public.pipeline ADD CONSTRAINT pipeline_stage_check CHECK (stage = ANY (ARRAY[
  'sourced', 'contacted', 'not_interested', 'recruiter_screen', 'rejected', 'moved_to_ats',
  -- legacy values kept valid for older rows
  'responded', 'screen', 'offer', 'in_process'
]));

ALTER TABLE public.pipeline ALTER COLUMN stage SET DEFAULT 'sourced';
