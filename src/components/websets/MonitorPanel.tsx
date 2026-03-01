import { useState, useEffect, useCallback } from 'react';
import { Clock, Play, Pause, Plus, Loader2, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { createMonitor, pauseMonitor, resumeMonitor, getMonitors, type WebsetMonitor } from '@/services/websets';

interface MonitorPanelProps {
  websetId: string;
  defaultQuery?: string;
}

const CRON_PRESETS = [
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Every 6 hours', cron: '0 */6 * * *' },
  { label: 'Daily 9am', cron: '0 9 * * *' },
  { label: 'Weekdays 9am', cron: '0 9 * * 1-5' },
  { label: 'Weekly Monday', cron: '0 9 * * 1' },
];

const MonitorPanel = ({ websetId, defaultQuery }: MonitorPanelProps) => {
  const [monitors, setMonitors] = useState<WebsetMonitor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCron, setSelectedCron] = useState(CRON_PRESETS[2].cron);
  const [customCron, setCustomCron] = useState('');
  const [monitorCount, setMonitorCount] = useState(10);
  const [behavior, setBehavior] = useState<'append' | 'override'>('append');
  const [isCreating, setIsCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchMonitors = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMonitors(websetId);
      setMonitors(data);
    } catch (err) {
      console.error('Failed to fetch monitors:', err);
    } finally {
      setIsLoading(false);
    }
  }, [websetId]);

  useEffect(() => { fetchMonitors(); }, [fetchMonitors]);

  const handleCreate = async () => {
    const cron = customCron.trim() || selectedCron;
    if (!cron) return;
    setIsCreating(true);
    try {
      const monitor = await createMonitor(websetId, cron, {
        query: defaultQuery,
        entity: { type: 'person' },
        count: monitorCount,
        behavior,
      });
      setMonitors(prev => [monitor, ...prev]);
      setShowCreate(false);
      setCustomCron('');
      toast({ title: 'Monitor created' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create monitor';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (monitor: WebsetMonitor) => {
    setTogglingId(monitor.id);
    try {
      if (monitor.status === 'active') {
        await pauseMonitor(websetId, monitor.id);
        setMonitors(prev => prev.map(m => m.id === monitor.id ? { ...m, status: 'paused' as const } : m));
        toast({ title: 'Monitor paused' });
      } else {
        await resumeMonitor(websetId, monitor.id);
        setMonitors(prev => prev.map(m => m.id === monitor.id ? { ...m, status: 'active' as const } : m));
        toast({ title: 'Monitor resumed' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle monitor';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-semibold text-foreground">Monitors</h3>
          <span className="text-[10px] text-muted-foreground">({monitors.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchMonitors}
            disabled={isLoading}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-1 text-[10px] font-display px-2 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <Plus className="w-3 h-3" /> New
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="space-y-2 p-3 rounded-lg border border-border bg-secondary/20">
          <p className="text-[10px] font-display text-muted-foreground">Schedule</p>
          <div className="flex flex-wrap gap-1.5">
            {CRON_PRESETS.map(preset => (
              <button
                key={preset.cron}
                onClick={() => { setSelectedCron(preset.cron); setCustomCron(''); }}
                className={`text-[10px] font-display px-2 py-0.5 rounded-full border transition-colors ${
                  selectedCron === preset.cron && !customCron
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            value={customCron}
            onChange={e => setCustomCron(e.target.value)}
            placeholder="Custom cron (e.g. 0 */4 * * *)"
            className="w-full bg-secondary/30 rounded-lg text-xs text-foreground p-2 outline-none border border-border focus:border-primary/30 font-body placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-muted-foreground">Count:</label>
              <input
                type="number"
                value={monitorCount}
                onChange={e => setMonitorCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
                min={1} max={50}
                className="w-14 bg-secondary/30 rounded text-xs text-foreground px-1.5 py-1 outline-none border border-border focus:border-primary/30"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-muted-foreground">Mode:</label>
              <select
                value={behavior}
                onChange={e => setBehavior(e.target.value as 'append' | 'override')}
                className="bg-secondary/30 rounded text-xs text-foreground px-1.5 py-1 outline-none border border-border focus:border-primary/30"
              >
                <option value="append">Append</option>
                <option value="override">Override</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={isCreating || (!customCron.trim() && !selectedCron)}
            className="inline-flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Create Monitor
          </button>
        </div>
      )}

      {/* Monitor list */}
      {monitors.length > 0 && (
        <div className="space-y-1.5">
          {monitors.map(monitor => (
            <div key={monitor.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20 border border-border">
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-display font-medium text-foreground">{monitor.cron}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-display px-1.5 py-0.5 rounded-full border ${
                    monitor.status === 'active'
                      ? 'bg-green-500/15 text-green-400 border-green-500/30'
                      : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {monitor.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {monitor.behavior} / {monitor.count || 10} items
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleToggle(monitor)}
                disabled={togglingId === monitor.id}
                className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                title={monitor.status === 'active' ? 'Pause' : 'Resume'}
              >
                {togglingId === monitor.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : monitor.status === 'active' ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {!isLoading && monitors.length === 0 && !showCreate && (
        <p className="text-xs text-muted-foreground">No monitors. Create one to auto-refresh this webset on a schedule.</p>
      )}
    </div>
  );
};

export default MonitorPanel;
