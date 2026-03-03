import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ParsedQuery {
  role?: string;
  skills?: string[];
  location?: string;
  seniority?: string;
  companies?: string[];
  qualifications?: string[];
  github_query?: string;
}

interface NLParserState {
  isParsing: boolean;
  parsed: ParsedQuery | null;
  originalQuery: string;
  error: string | null;
}

// Heuristic: detect if a query looks like natural language vs. GitHub search syntax
function isNaturalLanguage(query: string): boolean {
  // GitHub search syntax indicators
  const ghPatterns = /\b(language:|user:|org:|repo:|location:|stars:|followers:|in:)/i;
  if (ghPatterns.test(query)) return false;

  // Natural language indicators: 3+ words, contains common words
  const words = query.trim().split(/\s+/);
  if (words.length < 3) return false;

  const nlWords = /\b(who|with|that|looking|find|search|need|want|experienced|senior|junior|developer|engineer|in|at|from|has|have|worked)\b/i;
  return nlWords.test(query);
}

export function useNLQueryParser() {
  const [state, setState] = useState<NLParserState>({
    isParsing: false,
    parsed: null,
    originalQuery: '',
    error: null,
  });

  const parseQuery = useCallback(async (query: string): Promise<ParsedQuery | null> => {
    if (!isNaturalLanguage(query)) return null;

    setState({ isParsing: true, parsed: null, originalQuery: query, error: null });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-nl-query`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        }
      );

      if (!res.ok) throw new Error('Failed to parse query');

      const data = await res.json();
      const parsed = data.parsed as ParsedQuery;

      setState({ isParsing: false, parsed, originalQuery: query, error: null });
      return parsed;
    } catch (e) {
      setState(prev => ({ ...prev, isParsing: false, error: (e as Error).message }));
      return null;
    }
  }, []);

  const clearParsed = useCallback(() => {
    setState({ isParsing: false, parsed: null, originalQuery: '', error: null });
  }, []);

  return {
    ...state,
    parseQuery,
    clearParsed,
    isNaturalLanguage,
  };
}
