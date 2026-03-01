-- V2 QA Fixes Migration
-- P5: Add query_hash column for query-scoped score caching
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS query_hash text;

-- P8: Add linkedin_fetched_at for enrichment dedup/cooldown
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS linkedin_fetched_at timestamptz;

-- P2: Webset-to-user mapping for multi-tenant isolation
CREATE TABLE IF NOT EXISTS webset_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webset_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  query text,
  status text DEFAULT 'running',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webset_mappings_user_id ON webset_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_webset_mappings_webset_id ON webset_mappings(webset_id);
