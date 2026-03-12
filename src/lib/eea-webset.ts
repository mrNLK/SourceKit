/**
 * EEA Webset Helpers
 *
 * Utilities for converting between EEA signal formats,
 * building Webset creation payloads, and parsing enrichment results.
 */

import type {
  WebsetEEASignal,
  LegacyEEASignal,
  EEAWebsetConfig,
  EEAEnrichmentResult,
  EEAStrengthRating,
  EEAWebsetItem,
} from '@/types/eea';
import type { WebsetItem } from '@/services/websets';

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let counter = 0;
export function generateSignalId(): string {
  return `eea_${Date.now()}_${++counter}`;
}

// ---------------------------------------------------------------------------
// Convert legacy strategy signals to Webset-compatible signals
// ---------------------------------------------------------------------------

export function legacyToWebsetSignal(legacy: LegacyEEASignal): WebsetEEASignal {
  return {
    id: generateSignalId(),
    signal: legacy.signal,
    verification_method: `Verify via public web data: ${legacy.criterion}`,
    webset_criterion: legacy.criterion,
    enrichment_description: `Evidence for: ${legacy.signal}`,
    enrichment_format: 'text',
    enabled: true,
  };
}

export function legacyToWebsetSignals(signals: LegacyEEASignal[]): WebsetEEASignal[] {
  return signals.map(legacyToWebsetSignal);
}

// ---------------------------------------------------------------------------
// Build Webset creation payload
// ---------------------------------------------------------------------------

export interface WebsetCreatePayload {
  query: string;
  count: number;
  criteria: { description: string }[];
  enrichments: { description: string; format: string; options?: { label: string }[] }[];
}

export const MAX_WEBSET_CRITERIA = 5;

export function buildWebsetPayload(config: EEAWebsetConfig): WebsetCreatePayload {
  const enabledSignals = config.signals.filter(s => s.enabled);
  const selectedSignals = enabledSignals.slice(0, MAX_WEBSET_CRITERIA);

  const criteria = selectedSignals.map(s => ({
    description: s.webset_criterion,
  }));

  const signalEnrichments = selectedSignals.map(s => {
    const enrichment: { description: string; format: string; options?: { label: string }[] } = {
      description: s.enrichment_description,
      format: s.enrichment_format,
    };
    if (s.enrichment_format === 'options' && s.enrichment_options) {
      enrichment.options = s.enrichment_options.map(o => ({ label: o }));
    }
    return enrichment;
  });

  // Default enrichments: email + EEA strength rating
  const defaultEnrichments = [
    { description: 'Contact email', format: 'text' },
    {
      description: `EEA strength: how many of the following criteria does this person clearly meet? ${selectedSignals.map(s => s.signal).join('; ')}. Rate as Strong (3+), Moderate (2), or Weak (0-1)`,
      format: 'options',
      options: [
        { label: 'Strong' },
        { label: 'Moderate' },
        { label: 'Weak' },
      ],
    },
  ];

  return {
    query: config.searchQuery,
    count: config.searchCount,
    criteria,
    enrichments: [...signalEnrichments, ...defaultEnrichments],
  };
}

// ---------------------------------------------------------------------------
// Build monitor payload
// ---------------------------------------------------------------------------

export interface MonitorCreatePayload {
  cron: string;
  query: string;
  entity: { type: string };
  criteria: { description: string }[];
  count: number;
  behavior: 'append' | 'override';
}

export function buildMonitorPayload(config: EEAWebsetConfig): MonitorCreatePayload {
  const enabledSignals = config.signals.filter(s => s.enabled).slice(0, MAX_WEBSET_CRITERIA);
  return {
    cron: config.monitorCron,
    query: config.searchQuery,
    entity: { type: 'person' },
    criteria: enabledSignals.map(s => ({ description: s.webset_criterion })),
    count: 10,
    behavior: config.monitorBehavior,
  };
}

// ---------------------------------------------------------------------------
// Parse Webset items into EEA-enriched items
// ---------------------------------------------------------------------------

export function parseWebsetItemEEA(
  item: WebsetItem,
  signals: WebsetEEASignal[]
): EEAWebsetItem {
  const properties = item.properties || {};
  const enrichments: EEAEnrichmentResult[] = [];
  let email: string | undefined;
  let eea_strength: EEAStrengthRating | undefined;

  for (const [key, val] of Object.entries(properties)) {
    if (val.state !== 'completed') continue;

    // Match email enrichment
    if (key.toLowerCase().includes('email') || key.toLowerCase() === 'contact email') {
      email = val.value;
      continue;
    }

    // Match EEA strength rating
    if (key.toLowerCase().includes('eea strength')) {
      const rating = val.value as EEAStrengthRating;
      if (['Strong', 'Moderate', 'Weak'].includes(rating)) {
        eea_strength = rating;
      }
      continue;
    }

    // Try to match to a signal enrichment
    const matchedSignal = signals.find(s =>
      key.toLowerCase().includes(s.enrichment_description.toLowerCase().slice(0, 30)) ||
      s.enrichment_description.toLowerCase().includes(key.toLowerCase().slice(0, 30))
    );

    enrichments.push({
      signal_id: matchedSignal?.id || key,
      signal_name: matchedSignal?.signal || key,
      value: val.value,
      format: matchedSignal?.enrichment_format || 'text',
      verified: val.value !== null && val.value !== '' && val.value !== 'N/A',
    });
  }

  return {
    id: item.id,
    url: item.url,
    title: item.title,
    description: item.description,
    email,
    eea_strength,
    enrichments,
    properties: item.properties,
  };
}

// ---------------------------------------------------------------------------
// Composite EEA scoring
// ---------------------------------------------------------------------------

const STRENGTH_SCORE: Record<string, number> = { Strong: 30, Moderate: 15, Weak: 0 };

/**
 * Compute a 0-100 composite EEA score for a parsed webset item.
 * Formula:
 *   base (from eea_strength badge): 0/15/30
 *   + (verified enrichments / total signals) * 70
 * Gives a normalized 0-100 range.
 */
export function computeEEAScore(item: EEAWebsetItem, totalSignalCount: number): number {
  const base = STRENGTH_SCORE[item.eea_strength || ''] || 0;
  const verified = item.enrichments.filter(e => e.verified).length;
  const ratio = totalSignalCount > 0 ? verified / totalSignalCount : 0;
  return Math.round(base + ratio * 70);
}

// ---------------------------------------------------------------------------
// EEA strength badge colors
// ---------------------------------------------------------------------------

export const EEA_STRENGTH_COLORS: Record<EEAStrengthRating, {
  bg: string;
  text: string;
  border: string;
}> = {
  Strong: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Moderate: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  Weak: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
};

// ---------------------------------------------------------------------------
// Build search query from role + strategy
// ---------------------------------------------------------------------------

export function buildSearchQuery(role: string, company?: string, skills?: string[]): string {
  let query = role;
  if (company) query = `${role} at companies like ${company}`;
  if (skills && skills.length > 0) {
    query += ` with expertise in ${skills.slice(0, 5).join(', ')}`;
  }
  return query;
}
