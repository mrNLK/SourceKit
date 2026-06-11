-- Forward migration: remap old pipeline stages and apply new CHECK constraint.
-- Idempotent: safe to re-run on databases that already have the new stages.

-- 1. Drop the existing CHECK constraint on pipeline.stage (name may vary).
DO $$
DECLARE
  _con RECORD;
BEGIN
  FOR _con IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'public.pipeline'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%stage%'
  LOOP
    EXECUTE format('ALTER TABLE public.pipeline DROP CONSTRAINT %I', _con.conname);
  END LOOP;
END $$;

-- 2. Remap legacy stage values to new ones.
UPDATE public.pipeline SET stage = 'contacted'        WHERE stage = 'sourced';
UPDATE public.pipeline SET stage = 'contacted'        WHERE stage = 'responded';
UPDATE public.pipeline SET stage = 'recruiter_screen' WHERE stage = 'screen';
UPDATE public.pipeline SET stage = 'moved_to_ats'     WHERE stage = 'offer';

-- 3. Add the new CHECK constraint.
ALTER TABLE public.pipeline
  ADD CONSTRAINT pipeline_stage_check
  CHECK (stage IN ('contacted', 'not_interested', 'recruiter_screen', 'rejected', 'moved_to_ats'));

-- 4. Update the column default.
ALTER TABLE public.pipeline
  ALTER COLUMN stage SET DEFAULT 'contacted';
