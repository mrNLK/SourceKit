// SourceKit Recruiter OS — Export utilities

import type { RecruiterCandidate } from '../lib/types';
import { TIER_CONFIG, STAGE_CONFIG, CONTACT_STATUS_CONFIG } from '../lib/constants';

export function candidatesToCSV(candidates: RecruiterCandidate[]): string {
  const headers = [
    'Name', 'Title', 'Company', 'Location', 'Tier', 'Stage',
    'Composite Score', 'EEA', 'Builder', 'AI Recency', 'Systems Depth',
    'Product Instinct', 'Hidden Gem', 'Contact Status', 'Tags',
    'GitHub', 'LinkedIn', 'Email', 'Created',
  ];

  const rows = candidates.map(c => [
    c.name ?? '',
    c.current_title ?? '',
    c.current_company ?? '',
    c.location ?? '',
    TIER_CONFIG[c.tier]?.label ?? c.tier,
    STAGE_CONFIG[c.pipeline_stage]?.label ?? c.pipeline_stage,
    c.composite_score?.toString() ?? '',
    c.eea_score?.score?.toString() ?? '',
    c.builder_score?.score?.toString() ?? '',
    c.ai_recency_score?.score?.toString() ?? '',
    c.systems_depth_score?.score?.toString() ?? '',
    c.product_instinct_score?.score?.toString() ?? '',
    c.hidden_gem_score?.score?.toString() ?? '',
    CONTACT_STATUS_CONFIG[c.contact_status]?.label ?? c.contact_status,
    c.tags.join('; '),
    c.github_username ? `https://github.com/${c.github_username}` : '',
    c.linkedin_url ?? '',
    c.email ?? '',
    c.created_at,
  ]);

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
