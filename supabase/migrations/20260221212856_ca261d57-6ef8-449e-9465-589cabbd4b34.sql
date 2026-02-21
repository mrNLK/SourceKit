
-- Tighten INSERT/UPDATE to service role only
DROP POLICY "Allow service insert" ON public.candidates;
DROP POLICY "Allow service update" ON public.candidates;

CREATE POLICY "Service role insert" ON public.candidates FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update" ON public.candidates FOR UPDATE
  USING (auth.role() = 'service_role');
