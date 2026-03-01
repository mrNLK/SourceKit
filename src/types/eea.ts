/**
 * EEA Webset Types
 *
 * Types for the EEA-driven Webset creation flow:
 * Strategy generation -> EEA signal editing -> Webset creation -> Enrichment display
 */

// ---------------------------------------------------------------------------
// Core EEA Signal (extended for Webset integration)
// ---------------------------------------------------------------------------

export interface WebsetEEASignal {
  id: string;
  signal: string;
  verification_method: string;
  webset_criterion: string;
  enrichment_description: string;
  enrichment_format: 'text' | 'number' | 'options' | 'email' | 'url';
  enrichment_options?: string[]; // for "options" format
  enabled: boolean;
}

// Legacy signal shape from existing strategy generation
export interface LegacyEEASignal {
  signal: string;
  strength: 'strong' | 'moderate';
  criterion: string;
}

// ---------------------------------------------------------------------------
// Webset creation config
// ---------------------------------------------------------------------------

export interface EEAWebsetConfig {
  role: string;
  searchQuery: string;
  signals: WebsetEEASignal[];
  searchCount: number;
  monitorCron: string;
  monitorBehavior: 'append' | 'override';
}

// ---------------------------------------------------------------------------
// Enrichment results (from Webset items)
// ---------------------------------------------------------------------------

export interface EEAEnrichmentResult {
  signal_id: string;
  signal_name: string;
  value: string | number | null;
  format: string;
  verified: boolean;
}

export type EEAStrengthRating = 'Strong' | 'Moderate' | 'Weak';

export interface EEAWebsetItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  email?: string;
  eea_strength?: EEAStrengthRating;
  enrichments: EEAEnrichmentResult[];
  properties?: Record<string, { value: string; state: string }>;
}

// ---------------------------------------------------------------------------
// Template storage (Supabase)
// ---------------------------------------------------------------------------

export interface EEASignalTemplate {
  id: string;
  user_id: string;
  role_category: string;
  signal_name: string;
  webset_criterion: string;
  enrichment_description: string;
  enrichment_format: string;
  enrichment_options?: string[];
  created_at: string;
  updated_at: string;
}
