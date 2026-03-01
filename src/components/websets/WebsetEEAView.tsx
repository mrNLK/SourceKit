import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, UserPlus, Check, Loader2, ExternalLink, Mail, Download, ArrowUpDown, Filter, Users } from 'lucide-react';
import type { WebsetEEASignal, EEAStrengthRating } from '@/types/eea';
import type { WebsetItem } from '@/services/websets';
import { parseWebsetItemEEA, computeEEAScore } from '@/lib/eea-webset';
import { exportEEAItemsToCSV } from '@/lib/csv-export';
import EEABadge from './EEABadge';

interface WebsetEEAViewProps {
  items: WebsetItem[];
  signals: WebsetEEASignal[];
  onAddToPipeline?: (item: WebsetItem) => Promise<void>;
  onBatchImport?: (items: WebsetItem[]) => Promise<void>;
  addedItems?: Set<string>;
  addingItem?: string | null;
  isBatchImporting?: boolean;
}

const WebsetEEAView = ({ items, signals, onAddToPipeline, onBatchImport, addedItems, addingItem, isBatchImporting }: WebsetEEAViewProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filterStrength, setFilterStrength] = useState<EEAStrengthRating | 'all'>('all');
  const [sortByScore, setSortByScore] = useState(false);
  const [signalFilter, setSignalFilter] = useState<string | null>(null);
  const [showSignalFilter, setShowSignalFilter] = useState(false);

  const enabledSignals = useMemo(() => signals.filter(s => s.enabled), [signals]);
  const enabledSignalCount = enabledSignals.length;

  const enrichedItems = useMemo(() => {
    return items.map(item => parseWebsetItemEEA(item, signals));
  }, [items, signals]);

  const scoredItems = useMemo(() => {
    return enrichedItems.map(item => ({
      ...item,
      eeaScore: computeEEAScore(item, enabledSignalCount),
    }));
  }, [enrichedItems, enabledSignalCount]);

  const filteredItems = useMemo(() => {
    let result = filterStrength === 'all' ? scoredItems : scoredItems.filter(item => item.eea_strength === filterStrength);

    // Signal-level filter: only items where the selected signal is verified
    if (signalFilter) {
      result = result.filter(item =>
        item.enrichments.some(e => e.signal_id === signalFilter && e.verified)
      );
    }

    if (sortByScore) {
      result = [...result].sort((a, b) => b.eeaScore - a.eeaScore);
    }
    return result;
  }, [scoredItems, filterStrength, sortByScore, signalFilter]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stats = useMemo(() => {
    const counts = { Strong: 0, Moderate: 0, Weak: 0, unknown: 0 };
    enrichedItems.forEach(item => {
      if (item.eea_strength) counts[item.eea_strength]++;
      else counts.unknown++;
    });
    return counts;
  }, [enrichedItems]);

  // Signal pass rates for filter display
  const signalPassRates = useMemo(() => {
    const rates: Record<string, { total: number; verified: number }> = {};
    enabledSignals.forEach(s => { rates[s.id] = { total: 0, verified: 0 }; });
    enrichedItems.forEach(item => {
      item.enrichments.forEach(e => {
        if (rates[e.signal_id]) {
          rates[e.signal_id].total++;
          if (e.verified) rates[e.signal_id].verified++;
        }
      });
    });
    return rates;
  }, [enrichedItems, enabledSignals]);

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setFilterStrength('all')}
          className={`text-[10px] font-display px-2.5 py-1 rounded-full border transition-colors ${
            filterStrength === 'all'
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
          }`}
        >
          All ({enrichedItems.length})
        </button>
        {(['Strong', 'Moderate', 'Weak'] as const).map(strength => (
          <button
            key={strength}
            onClick={() => setFilterStrength(filterStrength === strength ? 'all' : strength)}
            className={`text-[10px] font-display px-2.5 py-1 rounded-full border transition-colors ${
              filterStrength === strength
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            {strength} ({stats[strength]})
          </button>
        ))}
        <div className="flex-1" />
        {/* Signal filter toggle */}
        {enabledSignals.length > 0 && (
          <button
            onClick={() => setShowSignalFilter(!showSignalFilter)}
            className={`inline-flex items-center gap-1 text-[10px] font-display px-2.5 py-1 rounded-full border transition-colors ${
              signalFilter || showSignalFilter ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
            }`}
          >
            <Filter className="w-3 h-3" /> Signals
          </button>
        )}
        <button
          onClick={() => setSortByScore(!sortByScore)}
          className={`inline-flex items-center gap-1 text-[10px] font-display px-2.5 py-1 rounded-full border transition-colors ${
            sortByScore ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
          }`}
        >
          <ArrowUpDown className="w-3 h-3" /> {sortByScore ? 'Score' : 'Sort'}
        </button>
        {filteredItems.length > 0 && (
          <button
            onClick={() => exportEEAItemsToCSV(filteredItems)}
            className="inline-flex items-center gap-1 text-[10px] font-display px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <Download className="w-3 h-3" /> Export CSV
          </button>
        )}
        {onBatchImport && filteredItems.length > 0 && (
          <button
            onClick={() => {
              const notAdded = filteredItems.filter(item => !addedItems?.has(item.id));
              const originalItems = notAdded.map(fi => items.find(i => i.id === fi.id)).filter(Boolean) as WebsetItem[];
              if (originalItems.length > 0) onBatchImport(originalItems);
            }}
            disabled={isBatchImporting}
            className="inline-flex items-center gap-1 text-[10px] font-display px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-50"
          >
            {isBatchImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
            Import All ({filteredItems.filter(i => !addedItems?.has(i.id)).length})
          </button>
        )}
      </div>

      {/* Signal filter panel */}
      {showSignalFilter && (
        <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border border-border bg-secondary/20">
          <button
            onClick={() => setSignalFilter(null)}
            className={`text-[10px] font-display px-2 py-0.5 rounded-full border transition-colors ${
              !signalFilter ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            All Signals
          </button>
          {enabledSignals.map(s => {
            const rate = signalPassRates[s.id];
            const pct = rate && rate.total > 0 ? Math.round((rate.verified / rate.total) * 100) : 0;
            return (
              <button
                key={s.id}
                onClick={() => setSignalFilter(signalFilter === s.id ? null : s.id)}
                className={`text-[10px] font-display px-2 py-0.5 rounded-full border transition-colors truncate max-w-[200px] ${
                  signalFilter === s.id ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground hover:text-foreground'
                }`}
                title={`${s.signal} (${pct}% pass)`}
              >
                {s.signal} <span className="text-muted-foreground/60">{pct}%</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        {filteredItems.map(item => {
          const isExpanded = expandedItems.has(item.id);
          const isAdded = addedItems?.has(item.id);
          const isAdding = addingItem === item.id;

          return (
            <div key={item.id} className="rounded-lg border border-border bg-card overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-3 p-3">
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />
                  }
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    {item.eea_strength && <EEABadge strength={item.eea_strength} />}
                    {item.eeaScore > 0 && (
                      <span className={`text-[10px] font-display font-bold px-1.5 py-0.5 rounded ${
                        item.eeaScore >= 70 ? 'bg-emerald-500/15 text-emerald-400' :
                        item.eeaScore >= 40 ? 'bg-amber-500/15 text-amber-400' :
                        'bg-red-500/15 text-red-400'
                      }`}>{item.eeaScore}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline truncate flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> {item.url}
                      </a>
                    )}
                    {item.email && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Mail className="w-2.5 h-2.5" /> {item.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Pipeline button */}
                {onAddToPipeline && (
                  <button
                    onClick={() => {
                      const originalItem = items.find(i => i.id === item.id);
                      if (originalItem) onAddToPipeline(originalItem);
                    }}
                    disabled={isAdding || isAdded}
                    className="shrink-0 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 disabled:opacity-50 transition-colors"
                  >
                    {isAdding ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isAdded ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <UserPlus className="w-3 h-3" />
                    )}
                    {isAdded ? 'Added' : 'Pipeline'}
                  </button>
                )}
              </div>

              {/* Expanded: enrichment details */}
              {isExpanded && item.enrichments.length > 0 && (
                <div className="border-t border-border bg-secondary/20 p-3 space-y-2">
                  {item.enrichments.map((enrichment, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                        enrichment.verified ? 'bg-emerald-400' : 'bg-muted-foreground/40'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-display text-muted-foreground">
                          {enrichment.signal_name}
                        </p>
                        <p className="text-xs text-foreground font-body mt-0.5">
                          {enrichment.value || 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isExpanded && item.enrichments.length === 0 && (
                <div className="border-t border-border bg-secondary/20 p-3">
                  <p className="text-xs text-muted-foreground">No enrichment results yet. Check back once processing completes.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            {signalFilter
              ? 'No candidates pass this signal filter'
              : filterStrength === 'all'
                ? 'No items yet'
                : `No ${filterStrength} candidates found`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default WebsetEEAView;
