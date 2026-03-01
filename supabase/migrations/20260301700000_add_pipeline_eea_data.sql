-- Add EEA enrichment data to pipeline candidates
-- Stores webset-sourced EEA evidence as JSONB
-- Schema: { strength: "Strong"|"Moderate"|"Weak", enrichments: EEAEnrichmentResult[], webset_id?: string }
ALTER TABLE pipeline ADD COLUMN IF NOT EXISTS eea_data jsonb;
