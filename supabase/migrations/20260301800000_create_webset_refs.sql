-- Persistent webset refs (replaces localStorage)
CREATE TABLE IF NOT EXISTS webset_refs (
  id TEXT PRIMARY KEY,              -- Exa webset ID
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'running',
  eea_signals JSONB,               -- WebsetEEASignal[] snapshot
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE webset_refs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own webset refs"
  ON webset_refs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_webset_refs_user ON webset_refs(user_id, created_at DESC);
