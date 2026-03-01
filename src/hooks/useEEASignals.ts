import { useState, useCallback, useEffect } from 'react';
import type { WebsetEEASignal, EEASignalTemplate } from '@/types/eea';
import type { WebsetEEASignalStrategy } from '@/components/research/StrategyEditor';
import { generateSignalId } from '@/lib/eea-webset';
import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Convert strategy output to WebsetEEASignal
// ---------------------------------------------------------------------------

function strategyToWebsetSignal(raw: WebsetEEASignalStrategy): WebsetEEASignal {
  return {
    id: generateSignalId(),
    signal: raw.signal,
    verification_method: raw.verification_method || `Verify: ${raw.criterion}`,
    webset_criterion: raw.webset_criterion || raw.criterion,
    enrichment_description: raw.enrichment_description || `Evidence for: ${raw.signal}`,
    enrichment_format: raw.enrichment_format || 'text',
    enrichment_options: raw.enrichment_options,
    enabled: true,
  };
}

function templateToWebsetSignal(tpl: EEASignalTemplate): WebsetEEASignal {
  return {
    id: generateSignalId(),
    signal: tpl.signal_name,
    verification_method: `Verify: ${tpl.webset_criterion}`,
    webset_criterion: tpl.webset_criterion,
    enrichment_description: tpl.enrichment_description,
    enrichment_format: tpl.enrichment_format as WebsetEEASignal['enrichment_format'],
    enrichment_options: tpl.enrichment_options,
    enabled: true,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEEASignals() {
  const [signals, setSignals] = useState<WebsetEEASignal[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<EEASignalTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Parse signals from strategy response
  const parseFromStrategy = useCallback((rawSignals: WebsetEEASignalStrategy[]) => {
    const parsed = rawSignals.map(strategyToWebsetSignal);
    setSignals(parsed);
    return parsed;
  }, []);

  // Load saved templates for a role category
  const loadTemplates = useCallback(async (roleCategory: string) => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('eea_signal_templates')
        .select('*')
        .eq('role_category', roleCategory)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load EEA templates:', error);
        return [];
      }

      const templates = (data || []) as unknown as EEASignalTemplate[];
      setSavedTemplates(templates);
      return templates;
    } catch (err) {
      console.error('Failed to load EEA templates:', err);
      return [];
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  // Apply templates as signals (fallback when strategy doesn't include webset fields)
  const applyTemplates = useCallback((templates: EEASignalTemplate[]) => {
    const converted = templates.map(templateToWebsetSignal);
    setSignals(converted);
    return converted;
  }, []);

  // Save current signals as templates for reuse
  const saveAsTemplates = useCallback(async (roleCategory: string) => {
    const enabledSignals = signals.filter(s => s.enabled);
    if (enabledSignals.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const rows = enabledSignals.map(s => ({
        user_id: user.id,
        role_category: roleCategory,
        signal_name: s.signal,
        webset_criterion: s.webset_criterion,
        enrichment_description: s.enrichment_description,
        enrichment_format: s.enrichment_format,
        enrichment_options: s.enrichment_options || null,
      }));

      const { error } = await supabase
        .from('eea_signal_templates')
        .insert(rows);

      if (error) {
        console.error('Failed to save EEA templates:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Failed to save EEA templates:', err);
      return false;
    }
  }, [signals]);

  return {
    signals,
    setSignals,
    savedTemplates,
    isLoadingTemplates,
    parseFromStrategy,
    loadTemplates,
    applyTemplates,
    saveAsTemplates,
  };
}
