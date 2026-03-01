import { useState, useEffect } from 'react';
import { Shield, Plus, ChevronDown, ChevronUp, Save, FolderOpen, Loader2 } from 'lucide-react';
import type { WebsetEEASignal, EEASignalTemplate } from '@/types/eea';
import { generateSignalId } from '@/lib/eea-webset';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import EEASignalCard from './EEASignalCard';

interface EEASignalEditorProps {
  signals: WebsetEEASignal[];
  onChange: (signals: WebsetEEASignal[]) => void;
  roleCategory?: string;
}

const EEASignalEditor = ({ signals, onChange, roleCategory }: EEASignalEditorProps) => {
  const [expanded, setExpanded] = useState(true);
  const [newSignalText, setNewSignalText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateGroups, setTemplateGroups] = useState<Record<string, EEASignalTemplate[]>>({});

  const handleUpdate = (idx: number, updated: WebsetEEASignal) => {
    const next = [...signals];
    next[idx] = updated;
    onChange(next);
  };

  const handleRemove = (idx: number) => {
    onChange(signals.filter((_, i) => i !== idx));
  };

  const handleAdd = () => {
    if (!newSignalText.trim()) return;
    const newSignal: WebsetEEASignal = {
      id: generateSignalId(),
      signal: newSignalText.trim(),
      verification_method: 'Verify via public web data',
      webset_criterion: newSignalText.trim(),
      enrichment_description: `Evidence for: ${newSignalText.trim()}`,
      enrichment_format: 'text',
      enabled: true,
    };
    onChange([...signals, newSignal]);
    setNewSignalText('');
  };

  // Save enabled signals as templates
  const handleSave = async () => {
    const enabledSignals = signals.filter(s => s.enabled);
    if (enabledSignals.length === 0) {
      toast({ title: 'No enabled signals to save', variant: 'destructive' });
      return;
    }
    const category = roleCategory?.trim() || 'General';
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: 'Sign in to save templates', variant: 'destructive' }); return; }

      const rows = enabledSignals.map(s => ({
        user_id: user.id,
        role_category: category,
        signal_name: s.signal,
        webset_criterion: s.webset_criterion,
        enrichment_description: s.enrichment_description,
        enrichment_format: s.enrichment_format,
        enrichment_options: s.enrichment_options || null,
      }));

      const { error } = await supabase.from('eea_signal_templates').insert(rows);
      if (error) throw error;
      toast({ title: `Saved ${enabledSignals.length} signals as "${category}" template` });
    } catch (err) {
      console.error('Save templates error:', err);
      toast({ title: 'Failed to save templates', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Load all templates grouped by role_category
  const handleLoadTemplates = async () => {
    if (showTemplates) { setShowTemplates(false); return; }
    setIsLoadingTemplates(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: 'Sign in to load templates', variant: 'destructive' }); return; }

      const { data, error } = await supabase
        .from('eea_signal_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const templates = (data || []) as unknown as EEASignalTemplate[];
      const groups: Record<string, EEASignalTemplate[]> = {};
      templates.forEach(t => {
        const cat = t.role_category || 'General';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(t);
      });
      setTemplateGroups(groups);
      setShowTemplates(true);
    } catch (err) {
      console.error('Load templates error:', err);
      toast({ title: 'Failed to load templates', variant: 'destructive' });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Apply a single template as a new signal (skip duplicates)
  const applyTemplate = (tpl: EEASignalTemplate) => {
    const isDuplicate = signals.some(s => s.signal === tpl.signal_name && s.webset_criterion === tpl.webset_criterion);
    if (isDuplicate) {
      toast({ title: 'Signal already exists' });
      return;
    }
    const newSignal: WebsetEEASignal = {
      id: generateSignalId(),
      signal: tpl.signal_name,
      verification_method: `Verify: ${tpl.webset_criterion}`,
      webset_criterion: tpl.webset_criterion,
      enrichment_description: tpl.enrichment_description,
      enrichment_format: tpl.enrichment_format as WebsetEEASignal['enrichment_format'],
      enrichment_options: tpl.enrichment_options,
      enabled: true,
    };
    onChange([...signals, newSignal]);
    toast({ title: `Added: ${tpl.signal_name}` });
  };

  // Apply all templates in a group
  const applyGroup = (templates: EEASignalTemplate[]) => {
    const existing = new Set(signals.map(s => `${s.signal}::${s.webset_criterion}`));
    const newSignals: WebsetEEASignal[] = [];
    templates.forEach(tpl => {
      const key = `${tpl.signal_name}::${tpl.webset_criterion}`;
      if (!existing.has(key)) {
        newSignals.push({
          id: generateSignalId(),
          signal: tpl.signal_name,
          verification_method: `Verify: ${tpl.webset_criterion}`,
          webset_criterion: tpl.webset_criterion,
          enrichment_description: tpl.enrichment_description,
          enrichment_format: tpl.enrichment_format as WebsetEEASignal['enrichment_format'],
          enrichment_options: tpl.enrichment_options,
          enabled: true,
        });
        existing.add(key);
      }
    });
    if (newSignals.length === 0) {
      toast({ title: 'All signals already present' });
      return;
    }
    onChange([...signals, ...newSignals]);
    toast({ title: `Added ${newSignals.length} signals` });
  };

  const enabledCount = signals.filter(s => s.enabled).length;

  return (
    <div className="glass rounded-xl p-5">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 py-2 group"
      >
        <Shield className="w-4 h-4 text-primary shrink-0" />
        <span className="font-display text-sm font-semibold text-foreground flex-1 text-left">
          Evidence of Exceptional Ability
        </span>
        <span className="text-[10px] font-display text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
          {enabledCount}/{signals.length}
        </span>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        }
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <p className="text-[10px] text-muted-foreground font-display mb-3">
            Each signal becomes a verification criterion in the Webset + an enrichment field.
            Edit criterion text to tune what Exa's agent checks. Toggle off signals you don't need.
          </p>

          {/* Template actions */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handleSave}
              disabled={isSaving || enabledCount === 0}
              className="inline-flex items-center gap-1 text-[10px] font-display px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-40"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save as Template
            </button>
            <button
              onClick={handleLoadTemplates}
              disabled={isLoadingTemplates}
              className={`inline-flex items-center gap-1 text-[10px] font-display px-2.5 py-1 rounded-full border transition-colors ${
                showTemplates
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
              } disabled:opacity-40`}
            >
              {isLoadingTemplates ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3" />}
              {showTemplates ? 'Hide Templates' : 'Load Templates'}
            </button>
            {roleCategory && (
              <span className="text-[10px] text-muted-foreground/60 font-display ml-auto truncate max-w-[180px]">
                Category: {roleCategory}
              </span>
            )}
          </div>

          {/* Template picker */}
          {showTemplates && (
            <div className="rounded-lg border border-border bg-secondary/20 p-3 mb-3 max-h-60 overflow-y-auto space-y-3">
              {Object.keys(templateGroups).length === 0 ? (
                <p className="text-xs text-muted-foreground">No saved templates yet. Save your current signals to create one.</p>
              ) : (
                Object.entries(templateGroups).map(([category, templates]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-display font-semibold text-foreground">{category}</span>
                      <span className="text-[10px] text-muted-foreground">({templates.length})</span>
                      <button
                        onClick={() => applyGroup(templates)}
                        className="text-[10px] font-display text-primary hover:underline ml-auto"
                      >
                        Add All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {templates.map((tpl, i) => (
                        <button
                          key={`${tpl.id || i}`}
                          onClick={() => applyTemplate(tpl)}
                          className="text-[10px] font-display px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors truncate max-w-[200px]"
                          title={tpl.signal_name}
                        >
                          {tpl.signal_name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Signal cards */}
          {signals.map((signal, idx) => (
            <EEASignalCard
              key={signal.id}
              signal={signal}
              onChange={(updated) => handleUpdate(idx, updated)}
              onRemove={() => handleRemove(idx)}
            />
          ))}

          {/* Add custom signal */}
          <div className="flex items-center gap-2 mt-3">
            <input
              value={newSignalText}
              onChange={e => setNewSignalText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Add custom EEA signal..."
              className="flex-1 bg-secondary/30 rounded-lg text-xs text-foreground p-2.5 outline-none border border-border focus:border-primary/30 font-body placeholder:text-muted-foreground"
            />
            <button
              onClick={handleAdd}
              disabled={!newSignalText.trim()}
              className="flex items-center gap-1 text-xs font-display px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-40"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EEASignalEditor;
