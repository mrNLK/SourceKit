import { useState, useCallback } from 'react';
import type { WebsetEEASignal, EEAWebsetConfig } from '@/types/eea';
import { buildWebsetPayload, buildSearchQuery } from '@/lib/eea-webset';
import { createWebset } from '@/services/websets';

interface UseEEAWebsetOptions {
  onCreated?: (websetId: string, config: EEAWebsetConfig) => void;
  addWebsetRef?: (ref: {
    id: string;
    query: string;
    count: number;
    status: string;
    createdAt: string;
    eeaSignals?: WebsetEEASignal[];
  }) => void;
}

export function useEEAWebset(options?: UseEEAWebsetOptions) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdWebsetId, setCreatedWebsetId] = useState<string | null>(null);

  const createEEAWebset = useCallback(async (
    role: string,
    signals: WebsetEEASignal[],
    opts?: {
      company?: string;
      skills?: string[];
      searchCount?: number;
      monitorCron?: string;
    }
  ) => {
    const enabledSignals = signals.filter(s => s.enabled);
    if (enabledSignals.length === 0) {
      setError('Enable at least one EEA signal');
      return null;
    }

    setIsCreating(true);
    setError(null);

    const searchQuery = buildSearchQuery(role, opts?.company, opts?.skills);
    const config: EEAWebsetConfig = {
      role,
      searchQuery,
      signals: enabledSignals,
      searchCount: opts?.searchCount || 25,
      monitorCron: opts?.monitorCron || '0 9 * * 1',
      monitorBehavior: 'append',
    };

    try {
      const payload = buildWebsetPayload(config);
      const result = await createWebset(
        payload.query,
        payload.count,
        {
          criteria: payload.criteria,
          enrichments: payload.enrichments,
        }
      );

      // Note: Monitor creation requires the edge function to support it.
      // For now we create the webset and log the monitor config for future use.
      // The edge function can be extended to accept a monitor param.
      console.log('Monitor config for future setup:', {
        websetId: result.id,
        cron: config.monitorCron,
        query: config.searchQuery,
        criteria: payload.criteria,
      });

      setCreatedWebsetId(result.id);

      // Auto-register in webset refs with EEA signals attached
      options?.addWebsetRef?.({
        id: result.id,
        query: config.searchQuery,
        count: config.searchCount,
        status: 'running',
        createdAt: new Date().toISOString(),
        eeaSignals: enabledSignals,
      });

      options?.onCreated?.(result.id, config);
      return result.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create EEA Webset';
      setError(msg);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [options]);

  return {
    createEEAWebset,
    isCreating,
    error,
    createdWebsetId,
  };
}
