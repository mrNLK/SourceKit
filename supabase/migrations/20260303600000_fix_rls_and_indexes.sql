-- P4: Fix RLS policy gaps
-- outreach_events: users can read their own events via enrollment join
CREATE POLICY "Users read own outreach_events" ON public.outreach_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sequence_enrollments se
      JOIN public.outreach_sequences os ON os.id = se.sequence_id
      WHERE se.id = outreach_events.enrollment_id AND os.user_id = auth.uid()
    )
  );

-- search_alert_results: users can read their own alert results via saved_searches join
CREATE POLICY "Users read own alert_results" ON public.search_alert_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.saved_searches
      WHERE id = search_alert_results.saved_search_id AND user_id = auth.uid()
    )
  );

-- notifications: users can delete their own notifications
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);


-- P8: Add missing indexes on user_id and FK columns
CREATE INDEX IF NOT EXISTS idx_outreach_history_user_id ON public.outreach_history(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_history_created_at ON public.outreach_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_results_user_id ON public.search_results(user_id);
CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON public.search_results(search_id);
CREATE INDEX IF NOT EXISTS idx_search_results_candidate_id ON public.search_results(candidate_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_user_id ON public.pipeline_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_pipeline_id ON public.pipeline_events(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_created_at ON public.pipeline_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_sequence_id ON public.sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_pipeline_id ON public.sequence_enrollments(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_outreach_events_enrollment_id ON public.outreach_events(enrollment_id);

-- Composite indexes for common user+time pagination patterns
CREATE INDEX IF NOT EXISTS idx_pipeline_user_created ON public.pipeline(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_user_created ON public.search_history(user_id, created_at DESC);
