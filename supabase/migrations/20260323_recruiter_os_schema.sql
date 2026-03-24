-- SourceKit Recruiter OS — Database Schema Migration
-- Date: 2026-03-23
-- Description: Creates all tables required for the Recruiter OS product

-- ============================================================
-- 1. Role Scorecards
-- ============================================================
CREATE TABLE IF NOT EXISTS recruiter_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  talent_thesis TEXT,
  must_have_signals JSONB DEFAULT '[]',
  nice_to_have_signals JSONB DEFAULT '[]',
  suppressions JSONB DEFAULT '[]',
  scoring_weights JSONB DEFAULT '{"eea": 25, "builder": 20, "ai_recency": 20, "systems_depth": 15, "product_instinct": 10, "hidden_gem": 10}',
  outreach_tone TEXT DEFAULT 'professional',
  evaluation_questions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. Recruiter Candidates
-- ============================================================
CREATE TABLE IF NOT EXISTS recruiter_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  -- Identity
  name TEXT,
  avatar_url TEXT,
  current_title TEXT,
  current_company TEXT,
  location TEXT,
  bio TEXT,

  -- Links
  github_username TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  huggingface_url TEXT,
  blog_url TEXT,
  personal_site_url TEXT,
  email TEXT,

  -- Scores (JSONB with {score, evidence[], confidence, reason})
  eea_score JSONB,
  builder_score JSONB,
  ai_recency_score JSONB,
  systems_depth_score JSONB,
  product_instinct_score JSONB,
  hidden_gem_score JSONB,
  composite_score NUMERIC,
  outreach_priority TEXT DEFAULT 'medium' CHECK (outreach_priority IN ('high', 'medium', 'low')),

  -- Tiering
  tier TEXT DEFAULT 'unclassified' CHECK (tier IN ('tier_1', 'tier_2', 'borderline', 'below_bar', 'false_positive', 'nurture', 'ats_synced', 'unclassified')),

  -- Pipeline
  pipeline_stage TEXT DEFAULT 'new' CHECK (pipeline_stage IN ('new', 'under_review', 'outreach_sent', 'replied', 'screening', 'moved_to_ats', 'hold', 'suppressed')),

  -- Artifacts & evidence
  artifacts JSONB DEFAULT '[]',
  sourcing_rationale TEXT,
  hidden_gem_reasons JSONB DEFAULT '[]',

  -- Contact
  contact_status TEXT DEFAULT 'not_contacted' CHECK (contact_status IN ('not_contacted', 'contacted', 'replied', 'not_interested', 'scheduled')),

  -- Meta
  tags TEXT[] DEFAULT '{}',
  needs_review BOOLEAN DEFAULT false,
  search_ids UUID[] DEFAULT '{}',
  scorecard_id UUID REFERENCES recruiter_scorecards(id),
  ats_sync_status TEXT DEFAULT 'not_synced' CHECK (ats_sync_status IN ('not_synced', 'synced', 'sync_failed')),
  ats_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. Candidate Notes
-- ============================================================
CREATE TABLE IF NOT EXISTS recruiter_candidate_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  candidate_id UUID REFERENCES recruiter_candidates(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. Outreach Messages
-- ============================================================
CREATE TABLE IF NOT EXISTS recruiter_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  candidate_id UUID REFERENCES recruiter_candidates(id) ON DELETE CASCADE NOT NULL,
  scorecard_id UUID REFERENCES recruiter_scorecards(id),
  message TEXT NOT NULL,
  grounding_artifacts JSONB DEFAULT '[]',
  tone TEXT,
  sequence_step TEXT DEFAULT 'initial',
  channel TEXT DEFAULT 'email' CHECK (channel IN ('email', 'linkedin', 'other')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'personalize', 'hold', 'sent', 'replied')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. Agent Runs
-- ============================================================
CREATE TABLE IF NOT EXISTS recruiter_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('search', 'enrichment', 'scoring', 'outreach_generation', 'company_mapping', 'monitor', 'dedup_ats_sync')),
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'complete', 'failed', 'partial')),
  inputs JSONB NOT NULL DEFAULT '{}',
  outputs JSONB DEFAULT '{}',
  errors JSONB DEFAULT '[]',
  candidate_ids UUID[] DEFAULT '{}',
  scorecard_id UUID REFERENCES recruiter_scorecards(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- ============================================================
-- 6. Saved Searches
-- ============================================================
CREATE TABLE IF NOT EXISTS recruiter_saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  scorecard_id UUID REFERENCES recruiter_scorecards(id),
  config JSONB NOT NULL,
  result_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. Sequence Templates
-- ============================================================
CREATE TABLE IF NOT EXISTS recruiter_sequence_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  scorecard_id UUID REFERENCES recruiter_scorecards(id),
  name TEXT NOT NULL,
  steps JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_recruiter_candidates_user ON recruiter_candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_candidates_tier ON recruiter_candidates(user_id, tier);
CREATE INDEX IF NOT EXISTS idx_recruiter_candidates_stage ON recruiter_candidates(user_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_recruiter_candidates_composite ON recruiter_candidates(user_id, composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_recruiter_candidates_github ON recruiter_candidates(github_username);
CREATE INDEX IF NOT EXISTS idx_recruiter_candidates_linkedin ON recruiter_candidates(linkedin_url);
CREATE INDEX IF NOT EXISTS idx_recruiter_candidates_needs_review ON recruiter_candidates(user_id, needs_review) WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS idx_recruiter_candidates_tags ON recruiter_candidates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_recruiter_agent_runs_user ON recruiter_agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_agent_runs_status ON recruiter_agent_runs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recruiter_outreach_candidate ON recruiter_outreach(candidate_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_scorecards_user ON recruiter_scorecards(user_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_saved_searches_user ON recruiter_saved_searches(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE recruiter_scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own scorecards" ON recruiter_scorecards FOR ALL USING (auth.uid() = user_id);

ALTER TABLE recruiter_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own candidates" ON recruiter_candidates FOR ALL USING (auth.uid() = user_id);

ALTER TABLE recruiter_candidate_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notes" ON recruiter_candidate_notes FOR ALL USING (auth.uid() = user_id);

ALTER TABLE recruiter_outreach ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own outreach" ON recruiter_outreach FOR ALL USING (auth.uid() = user_id);

ALTER TABLE recruiter_agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agent runs" ON recruiter_agent_runs FOR ALL USING (auth.uid() = user_id);

ALTER TABLE recruiter_saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved searches" ON recruiter_saved_searches FOR ALL USING (auth.uid() = user_id);

ALTER TABLE recruiter_sequence_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sequence templates" ON recruiter_sequence_templates FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_recruiter_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recruiter_scorecards_updated
  BEFORE UPDATE ON recruiter_scorecards
  FOR EACH ROW EXECUTE FUNCTION update_recruiter_updated_at();

CREATE TRIGGER trg_recruiter_candidates_updated
  BEFORE UPDATE ON recruiter_candidates
  FOR EACH ROW EXECUTE FUNCTION update_recruiter_updated_at();

CREATE TRIGGER trg_recruiter_saved_searches_updated
  BEFORE UPDATE ON recruiter_saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_recruiter_updated_at();

CREATE TRIGGER trg_recruiter_sequence_templates_updated
  BEFORE UPDATE ON recruiter_sequence_templates
  FOR EACH ROW EXECUTE FUNCTION update_recruiter_updated_at();

CREATE TRIGGER trg_recruiter_candidate_notes_updated
  BEFORE UPDATE ON recruiter_candidate_notes
  FOR EACH ROW EXECUTE FUNCTION update_recruiter_updated_at();
