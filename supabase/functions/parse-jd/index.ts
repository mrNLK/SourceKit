import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * Extract text from a JD URL using Parallel.ai (JS-rendered pages) with
 * fallback to basic HTML fetch (static pages).
 */

async function extractWithParallel(url: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.parallel.ai/v1beta/extract', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'parallel-beta': 'true',
      },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      console.error('Parallel.ai extract error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    // Parallel may return text in various fields
    const text = data.content || data.text || data.extracted_text || '';
    if (typeof text === 'string' && text.length >= 100) {
      return text;
    }
    console.log('Parallel.ai returned insufficient text, falling back to HTML fetch');
    return null;
  } catch (e) {
    console.error('Parallel.ai extract failed:', e);
    return null;
  }
}

function extractWithFetch(html: string): string {
  let text = html
    // Remove script and style blocks entirely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Convert common block elements to newlines
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article|header|footer)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, '\u2014')
    .replace(/&ndash;/gi, '\u2013')
    .replace(/&bull;/gi, '\u2022')
    // Normalize whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  return text;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const { url, parallel_api_key } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL. Please provide a valid http/https URL.' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    let text: string | null = null;
    let source = 'fetch'; // Track which method succeeded

    // Try Parallel.ai first (handles JS-rendered pages like Greenhouse, Lever, Workable)
    const parallelKey = parallel_api_key || Deno.env.get('PARALLEL_API_KEY');
    if (parallelKey) {
      text = await extractWithParallel(url, parallelKey);
      if (text) source = 'parallel';
    }

    // Fallback to basic HTML fetch
    if (!text) {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        return new Response(JSON.stringify({ error: `Failed to fetch URL: HTTP ${response.status}` }), {
          status: 422,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      const html = await response.text();
      text = extractWithFetch(html);
    }

    // Truncate to ~15k chars to avoid blowing up the AI context
    if (text.length > 15000) {
      text = text.substring(0, 15000) + '\n\n[Content truncated]';
    }

    // Quick quality check
    if (text.length < 100) {
      return new Response(JSON.stringify({
        error: 'Could not extract meaningful text from this URL. The page may require JavaScript to render. Try pasting the job description text directly instead.',
        text: text,
      }), {
        status: 422,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ text, url, chars: text.length, source }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('parse-jd error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Failed to parse job description' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
