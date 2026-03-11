-- Rename pipeline stage 'offer' → 'in_process'

-- 1. Drop the existing CHECK constraint
ALTER TABLE public.pipeline DROP CONSTRAINT IF EXISTS pipeline_stage_check;

-- 2. Update existing rows
UPDATE public.pipeline SET stage = 'in_process' WHERE stage = 'offer';

-- 3. Re-add CHECK constraint with new value
ALTER TABLE public.pipeline ADD CONSTRAINT pipeline_stage_check
  CHECK (stage IN ('sourced', 'contacted', 'responded', 'screen', 'in_process'));

-- 4. Update any pipeline_events that reference the old stage name
UPDATE public.pipeline_events SET from_stage = 'in_process' WHERE from_stage = 'offer';
UPDATE public.pipeline_events SET to_stage = 'in_process' WHERE to_stage = 'offer';
