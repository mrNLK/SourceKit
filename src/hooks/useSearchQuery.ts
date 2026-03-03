import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  searchDevelopers,
  searchDevelopersStreaming,
  loadSearchResults,
  type SearchOptions,
  type SearchResponse,
  type StreamProgress,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type { Developer } from "@/types/developer";
import { isLikelyBot } from "@/lib/search-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StrategyHandoff {
  targetRepos?: string[];
  skills?: string[];
}

export interface StreamStep {
  step: string;
  detail?: string;
  done: boolean;
}

export interface UseSearchQueryOptions {
  activeQuery: string;
  activeSearchId: string | undefined;
  activeStrategy: StrategyHandoff | undefined;
  showUngettable: boolean;
  query: string;
  expandedQuery: string;
}

export interface UseSearchQueryResult {
  /** Merged, deduplicated, bot-filtered results */
  results: Developer[];
  parsedCriteria: SearchResponse["parsedCriteria"] | undefined;
  reposSearched: string[];
  isLoading: boolean;
  error: Error | null;
  isHistoryReplay: boolean;
  /** Whether data includes a credit charge */
  creditCharged: boolean | undefined;
  /** Real-time streaming progress steps */
  streamSteps: StreamStep[];
  /** Fallback search step index for timed progress */
  searchStep: number;
  /** Rate-limit state */
  isRateLimited: boolean;
  rateLimitCountdown: number;
  rateLimitAttempt: number;
  rateLimitTotal: number;
  /** Expand search results */
  expandedCount: number;
  isExpanding: boolean;
  handleExpandSearch: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const SEARCH_STEPS_FALLBACK_COUNT = 5;
const STEP_DELAYS = [0, 3000, 6000, 12000, 18000];

export function useSearchQuery({
  activeQuery,
  activeSearchId,
  activeStrategy,
  showUngettable,
  query,
  expandedQuery,
}: UseSearchQueryOptions): UseSearchQueryResult {
  const queryClient = useQueryClient();
  const historySavedForQuery = useRef<string>("");

  // Streaming progress
  const [streamSteps, setStreamSteps] = useState<StreamStep[]>([]);
  const [searchStep, setSearchStep] = useState(0);

  // Expanded results
  const [expandedResults, setExpandedResults] = useState<Developer[]>([]);
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandCount, setExpandCount] = useState(0);

  // Rate-limit retry
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const rateLimitRetryRef = useRef(0);
  const rateLimitTotalRef = useRef(0);

  // ---- Fresh search (streaming) ----
  const { data: freshData, isLoading: freshLoading, error: freshError } = useQuery({
    queryKey: ["github-search", activeQuery, activeStrategy?.targetRepos?.join(","), showUngettable],
    queryFn: ({ signal }) => {
      setStreamSteps([]);
      return searchDevelopersStreaming(
        activeQuery,
        {
          targetRepos: activeStrategy?.targetRepos,
          skills: activeStrategy?.skills,
          hideUngettable: !showUngettable,
        },
        (p: StreamProgress) => {
          if (signal?.aborted) return;
          setStreamSteps((prev) => {
            const updated = prev.map((s) => ({ ...s, done: true }));
            const existing = updated.findIndex((s) => s.step === p.step);
            if (existing >= 0) {
              updated[existing] = { step: p.step, detail: p.detail, done: false };
            } else {
              updated.push({ step: p.step, detail: p.detail, done: false });
            }
            return updated;
          });
        },
        signal,
      ).catch((err) => {
        if (signal?.aborted) throw err;
        if (err.message === "No response body") {
          return searchDevelopers(activeQuery, {
            targetRepos: activeStrategy?.targetRepos,
            skills: activeStrategy?.skills,
            hideUngettable: !showUngettable,
          });
        }
        throw err;
      });
    },
    enabled: !!activeQuery && !activeSearchId,
    staleTime: 1000 * 60 * 5,
  });

  // ---- Cached search (history replay) ----
  const { data: cachedData, isLoading: cachedLoading, error: cachedError } = useQuery({
    queryKey: ["cached-search", activeSearchId],
    queryFn: () => loadSearchResults(activeSearchId!),
    enabled: !!activeSearchId,
    staleTime: Infinity,
  });

  // ---- Unified data ----
  const isHistoryReplay = !!activeSearchId;
  const data = isHistoryReplay ? cachedData : freshData;
  const isLoading = isHistoryReplay ? cachedLoading : freshLoading;
  const error = (isHistoryReplay ? cachedError : freshError) as Error | null;

  // ---- Streaming fallback timers ----
  useEffect(() => {
    if (!isLoading || streamSteps.length > 0) {
      if (!isLoading) setSearchStep(0);
      return;
    }
    const timers = STEP_DELAYS.map((delay, i) =>
      i === 0 ? null : setTimeout(() => setSearchStep(i), delay)
    );
    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [isLoading, streamSteps.length]);

  // ---- Reset on new query ----
  useEffect(() => {
    setExpandedResults([]);
    setExpandCount(0);
    setStreamSteps([]);
  }, [activeQuery]);

  // ---- Rate-limit auto-retry ----
  const isRateLimited = !!error && error.message === "RATE_LIMITED";
  useEffect(() => {
    if (!isRateLimited) {
      setRateLimitCountdown(0);
      return;
    }
    const attempt = rateLimitRetryRef.current;
    if (attempt >= 3) return;
    const serverRetry = (error as Record<string, unknown> | null)?.retryAfterSeconds as number | undefined;
    const wait = serverRetry ? Math.min(serverRetry + attempt * 10, 120) : attempt === 0 ? 30 : attempt === 1 ? 60 : 90;
    rateLimitTotalRef.current = wait;
    setRateLimitCountdown(wait);
    const interval = setInterval(() => {
      setRateLimitCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          rateLimitRetryRef.current += 1;
          queryClient.invalidateQueries({ queryKey: ["github-search", activeQuery] });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRateLimited, activeQuery, queryClient, error]);

  useEffect(() => {
    rateLimitRetryRef.current = 0;
  }, [activeQuery]);

  // ---- Merge & deduplicate results ----
  const baseResults = data?.results || [];
  const parsedCriteria = data?.parsedCriteria;
  const reposSearched = data?.reposSearched || [];

  const results: Developer[] = useMemo(() => {
    let combined: Developer[];
    if (expandedResults.length === 0) {
      combined = baseResults;
    } else {
      const seen = new Set(baseResults.map((d) => d.username));
      combined = [...baseResults, ...expandedResults.filter((d) => !seen.has(d.username))];
    }
    const seen = new Map<string, Developer>();
    for (const d of combined) {
      const key = (d.username || "").toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.set(key, d);
    }
    return [...seen.values()].filter((d) => !isLikelyBot(d));
  }, [baseResults, expandedResults]);

  // ---- Save to history ----
  useEffect(() => {
    if (data && activeQuery && !isHistoryReplay && historySavedForQuery.current !== activeQuery) {
      historySavedForQuery.current = activeQuery;
      if (data.creditCharged === false) {
        toast({ title: "No results found", description: "Your search credit was not used." });
      }
      (async () => {
        try {
          const insertRow: Record<string, unknown> = {
            query: query || activeQuery,
            action_type: "search",
            result_count: baseResults.length,
            metadata: {
              expanded_query: expandedQuery || activeQuery,
              skills: parsedCriteria?.skills || [],
              location: parsedCriteria?.location || null,
              seniority: parsedCriteria?.seniority || null,
              status: baseResults.length > 0 ? "success" : "no_results",
            },
          };
          if (data.searchId) insertRow.id = data.searchId;
          await supabase.from("search_history").insert(insertRow as never);
          queryClient.invalidateQueries({ queryKey: ["search-history"] });
          if (data.creditCharged !== false) {
            window.dispatchEvent(new Event("sourcekit-search-complete"));
          }
        } catch {
          /* silent */
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (error && activeQuery && !isHistoryReplay && historySavedForQuery.current !== activeQuery) {
      historySavedForQuery.current = activeQuery;
      (async () => {
        try {
          await supabase.from("search_history").insert({
            query: query || activeQuery,
            action_type: "search",
            result_count: 0,
            metadata: {
              expanded_query: expandedQuery || activeQuery,
              status: "error",
              error: error.message,
            },
          } as never);
          queryClient.invalidateQueries({ queryKey: ["search-history"] });
        } catch {
          /* silent */
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // ---- Expand search ----
  const maxResults = 50;
  const handleExpandSearch = async () => {
    if (results.length >= maxResults || isExpanding || !activeQuery || isLoading) return;
    setIsExpanding(true);
    try {
      const nextCount = Math.min(results.length * 2, maxResults);
      const moreData = await searchDevelopers(activeQuery + ` (find at least ${nextCount} candidates)`);
      const existing = new Set(results.map((d) => d.username));
      const unique = (moreData.results || []).filter((d) => !existing.has(d.username));
      if (unique.length > 0) {
        setExpandedResults((prev) => [...prev, ...unique]);
        setExpandCount((prev) => prev + unique.length);
        toast({
          title: `Found ${unique.length} additional candidates`,
          description: `Total: ${results.length + unique.length} candidates`,
        });
      } else {
        toast({ title: "No additional candidates found", description: "Try broadening your search query." });
      }
    } catch (e) {
      toast({ title: "Expand failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setIsExpanding(false);
    }
  };

  return {
    results,
    parsedCriteria,
    reposSearched,
    isLoading,
    error,
    isHistoryReplay,
    creditCharged: data?.creditCharged,
    streamSteps,
    searchStep,
    isRateLimited,
    rateLimitCountdown,
    rateLimitAttempt: rateLimitRetryRef.current,
    rateLimitTotal: rateLimitTotalRef.current,
    expandedCount: expandCount,
    isExpanding,
    handleExpandSearch,
  };
}
