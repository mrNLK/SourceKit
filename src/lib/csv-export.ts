import type { EEAWebsetItem } from '@/types/eea';

/**
 * Export EEA-enriched webset items as CSV.
 * Columns: Name, URL, Email, EEA Strength, [one column per enrichment signal], Verified Count
 */
export function exportEEAItemsToCSV(items: EEAWebsetItem[], filename?: string): void {
  if (items.length === 0) return;

  // Collect all unique signal names across items for column headers
  const signalNames = new Set<string>();
  items.forEach(item => {
    item.enrichments.forEach(e => signalNames.add(e.signal_name));
  });
  const signalCols = Array.from(signalNames);

  // Build header
  const headers = ['Name', 'URL', 'Email', 'EEA Strength', ...signalCols, 'Verified Count'];

  // Build rows
  const rows = items.map(item => {
    const signalValues = signalCols.map(col => {
      const enrichment = item.enrichments.find(e => e.signal_name === col);
      if (!enrichment) return '';
      return String(enrichment.value || '');
    });
    const verifiedCount = item.enrichments.filter(e => e.verified).length;

    return [
      item.title,
      item.url,
      item.email || '',
      item.eea_strength || '',
      ...signalValues,
      String(verifiedCount),
    ];
  });

  // Escape CSV values
  const escape = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csv = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ].join('\n');

  // Trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `eea-candidates-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
