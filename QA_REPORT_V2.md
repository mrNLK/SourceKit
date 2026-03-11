# SourceKit / SourceProof — QA Report V2

**Date:** 2026-03-03
**Branch:** `claude/sourceproof-qa-features-QTIRm`
**Baseline:** 124 tests passing, 0 TypeScript errors, build clean

---

## Smoke Test Results

| Check | Result | Notes |
|-------|--------|-------|
| `vitest run` | 124/124 pass | All green |
| `tsc --noEmit` | 0 errors | Clean |
| `vite build` | Success (11s) | 495 KB main bundle (gzipped 140 KB) |
| ESLint | 78 errors, 11 warnings | 72 are `no-explicit-any`, rest are empty interfaces and hook dep warnings |

---

## Top 10 Issues — Bugs, Inefficiencies, and Feature Gaps

### P1: Streaming search has no AbortController — memory leak + stale state
**File:** `src/hooks/useSearchQuery.ts:98-134`
**Severity:** CRITICAL
The `searchDevelopersStreaming` callback sets React state (`setStreamSteps`) inside a streaming loop, but there is no `AbortController` passed to the fetch or checked in the callback. When the component unmounts mid-stream or the user fires a new search, the old stream keeps running, writing into stale state and leaking memory.

### P2: CORS fallback silently allows any origin
**File:** `supabase/functions/_shared/cors.ts:6-8`
**Severity:** HIGH
When an incoming `Origin` header doesn't match the whitelist, the code falls back to the first allowed origin instead of rejecting the request. An attacker on `evil.com` receives valid CORS headers for the production domain.

### P3: Full-schema.sql is missing 4 tables — cannot rebuild DB from scratch
**File:** `supabase/full-schema.sql`
**Severity:** HIGH
The consolidated schema is missing `outreach_sequences`, `sequence_enrollments`, `outreach_events` (from F3 migration `20260303300000`), and `webset_mappings` (from `20260228100000`). Also missing indexes from `search_results` migration.

### P4: RLS policies missing on 3 tables — data invisible or unprotectable
**Files:** Migrations `20260303300000` (line 42-44), `20260303500000` (lines 15-16, 29-32)
**Severity:** HIGH
- `outreach_events`: Only service-role policy; users can't read their own events.
- `search_alert_results`: Only service-role policy; users can't read their own alert results.
- `notifications`: Missing DELETE policy; `NotificationCenter.tsx` delete button silently fails.

### P5: useToast listener array pollutes on every state change
**File:** `src/hooks/use-toast.ts:166-177`
**Severity:** MEDIUM
The `useEffect` depends on `[state]`, so every toast action re-runs the effect, pushing a new `setState` reference into the global `listeners` array. Over time this causes O(n) broadcast on each toast and memory growth.

### P6: PipelineTab re-renders all cards on every interaction — missing memoization
**File:** `src/components/PipelineTab.tsx:211-274`
**Severity:** MEDIUM
`handleDrop`, `toggleTagFilter`, `handleShareToSlack`, and several other callbacks are recreated on every render and passed to every `PipelineCard`. With 50+ candidates, each drag/filter/note action triggers 50+ card re-renders. None use `useCallback` with stable deps.

### P7: No error boundaries around SearchTab or CandidateProfile
**Files:** `src/components/SearchTab.tsx`, `src/components/CandidateProfile.tsx`
**Severity:** MEDIUM
Both components orchestrate 5+ hooks (useSearchQuery, useNLQueryParser, useSavedSearches, useScoreExplanation, multiple useQuery calls). An unhandled error in any hook crashes the entire app — no fallback UI.

### P8: Missing database indexes on user_id columns — slow RLS-filtered queries
**Files:** Multiple migrations and `full-schema.sql`
**Severity:** MEDIUM
The BUG-01 fix added `user_id` to 7 tables with RLS policies that filter `WHERE auth.uid() = user_id`, but indexes were only added for 4 of them. Missing indexes on: `outreach_history.user_id`, `search_results.user_id`, `pipeline_events.user_id`. Also missing composite `(user_id, created_at)` indexes for efficient pagination.

### P9: bioContains in EEA scoring matches substrings — false positives
**File:** `src/lib/eea.ts:120-122, 204, 219`
**Severity:** MEDIUM
`bioContains` uses bare `string.includes()` without word boundaries. Checking for `'cto'` matches "factor", "vector"; `'react'` matches "reactive", "react-bootstrap"; `'google'` matches "googleplex". This inflates EEA scores for candidates who don't actually hold those titles or affiliations.

### P10: Webhook notification errors are silently swallowed
**File:** `src/lib/api.ts:239`
**Severity:** LOW-MEDIUM
`notifyStageChange` fires `.catch(() => {})` — all webhook failures are invisible. If Slack/webhook URLs are misconfigured, the user gets zero feedback that notifications aren't working.

---

## 10 Claude Code Prompts

Each prompt below is self-contained and can be copy-pasted into Claude Code.

---

### Prompt 1: Fix streaming search memory leak with AbortController

```
In src/hooks/useSearchQuery.ts, the streaming search (lines 98-134) creates a fetch
via searchDevelopersStreaming() but never passes an AbortController signal. When the
component unmounts or activeQuery changes mid-stream, the old stream keeps calling
setStreamSteps on stale state.

Fix:
1. In src/lib/api.ts searchDevelopersStreaming(), add an optional AbortSignal parameter
   and pass it to the internal fetch() call.
2. In useSearchQuery.ts, create an AbortController in the queryFn. Store it in a ref.
3. In the useEffect that resets on [activeQuery] (lines 163-167), abort the previous
   controller before resetting state.
4. In the streaming callback, check signal.aborted before calling setStreamSteps.
5. Add a cleanup return in the parent useEffect or use React Query's signal parameter
   from the queryFn context.

Verify: npx tsc --noEmit && npx vitest run
Commit with message: "P1: Add AbortController to streaming search to prevent memory leaks"
```

---

### Prompt 2: Fix CORS fallback to reject unknown origins

```
In supabase/functions/_shared/cors.ts, line 6-8, when an incoming Origin header
doesn't match the ALLOWED_ORIGINS whitelist, the code falls back to ALLOWED_ORIGINS[0]
instead of rejecting the request. This means any origin gets valid CORS headers.

Fix:
1. Change the fallback logic: if the origin is NOT in the whitelist, set
   allowedOrigin to '' (empty string) or omit the Access-Control-Allow-Origin header.
2. In the corsHeaders object, only include Access-Control-Allow-Origin if
   allowedOrigin is truthy.
3. Update the OPTIONS preflight handler in cors.ts (if present) to return 403 for
   unknown origins.
4. Keep the existing ALLOWED_ORIGINS list intact (localhost:8080, getsourcekit.vercel.app, etc.).

Verify: grep through all edge functions to ensure they still get valid CORS headers
for allowed origins.
Commit with message: "P2: Reject CORS requests from unknown origins instead of defaulting"
```

---

### Prompt 3: Add missing tables and indexes to full-schema.sql

```
The consolidated supabase/full-schema.sql is missing tables that exist in migrations.
This means the schema cannot rebuild the database from scratch.

Add the following to full-schema.sql:
1. outreach_sequences table (from migration 20260303300000_email_sequences.sql lines 2-11)
2. sequence_enrollments table (from same migration lines 15-28)
3. outreach_events table (from same migration lines 33-44)
4. webset_mappings table (from migration 20260228100000_v2_qa_fixes.sql lines 9-20)
5. Add the missing indexes from search_results migration (20260301100000 lines 17-18):
   idx_search_results_search_id and idx_search_results_candidate_id
6. Add missing indexes on FK columns: sequence_enrollments(sequence_id),
   sequence_enrollments(pipeline_id), outreach_events(enrollment_id)

Include RLS policies exactly as defined in the migrations. Place them after the
existing section 15 (webset_mappings), numbered as sections 16-19.

Verify: Review the migration files to ensure accuracy.
Commit with message: "P3: Add missing tables and indexes to full-schema.sql"
```

---

### Prompt 4: Fix RLS policy gaps on outreach_events, search_alert_results, notifications

```
Three tables have incomplete RLS policies that will cause silent failures in the frontend.

Fix all three:

1. outreach_events (migration 20260303300000 line 42-44):
   Currently only has a service_role policy. Add a user-scoped SELECT policy:
   CREATE POLICY "Users read own outreach_events" ON public.outreach_events
     FOR SELECT USING (
       EXISTS (
         SELECT 1 FROM public.sequence_enrollments se
         JOIN public.outreach_sequences os ON os.id = se.sequence_id
         WHERE se.id = outreach_events.enrollment_id AND os.user_id = auth.uid()
       )
     );

2. search_alert_results (migration 20260303500000 line 15-16):
   Add user-scoped SELECT:
   CREATE POLICY "Users read own alert_results" ON public.search_alert_results
     FOR SELECT USING (
       EXISTS (
         SELECT 1 FROM public.saved_searches
         WHERE id = search_alert_results.saved_search_id AND user_id = auth.uid()
       )
     );

3. notifications (migration 20260303500000 line 29-32):
   Add missing DELETE policy:
   CREATE POLICY "Users delete own notifications" ON public.notifications
     FOR DELETE USING (auth.uid() = user_id);

Create a new migration file: supabase/migrations/20260303600000_fix_rls_gaps.sql
Also update full-schema.sql with the new policies.

Commit with message: "P4: Add missing RLS policies for outreach_events, alert_results, notifications"
```

---

### Prompt 5: Fix useToast listener array pollution

```
In src/hooks/use-toast.ts, the useEffect at lines 166-177 has [state] in its dependency
array. Every toast action changes state, which re-runs the effect, pushing a new setState
into the global listeners array. Over time this causes O(n) broadcast and memory growth.

Fix:
1. Remove [state] from the useEffect dependency array — change it to [] (empty).
   The setState function identity is stable across renders, so this is safe.
2. Verify the cleanup function properly removes the exact setState reference.
3. Consider using useRef to store the setState to avoid any closure issues.

This is a minimal, targeted fix. Do NOT refactor the entire toast system.

Verify: npx tsc --noEmit && npx vitest run
Commit with message: "P5: Fix useToast listener leak by removing state from effect deps"
```

---

### Prompt 6: Memoize PipelineTab callbacks to prevent mass re-renders

```
In src/components/PipelineTab.tsx, event handlers like handleDrop (line 211),
toggleTagFilter (line 268), and handleShareToSlack (line 221) are recreated on every
render. Since they're passed to PipelineCard children, all cards re-render on every
interaction.

Fix:
1. Wrap handleDrop in useCallback with [queryClient] as dependency.
2. Wrap toggleTagFilter in useCallback. Use functional setState to avoid closing over
   activeTagFilters: setActiveTagFilters(prev => { const next = new Set(prev); ... })
3. Wrap handleShareToSlack in useCallback with [toast] as dependency.
4. Wrap handleRemoveTag, handleAddTag, handleNotesChange, handleNotesBlur in useCallback.
5. Wrap the PipelineCard component render in React.memo() to skip re-renders when
   props haven't changed.
6. Do NOT add useMemo/useCallback to handlers that are only used once (e.g., the
   main filter/sort logic which is already in useMemo).

Verify: npx tsc --noEmit && npx vitest run
Commit with message: "P6: Memoize PipelineTab callbacks and memo PipelineCard to reduce re-renders"
```

---

### Prompt 7: Add error boundaries around SearchTab and CandidateProfile

```
SearchTab and CandidateProfile orchestrate 5+ hooks each with async operations.
An unhandled error crashes the entire app with no recovery.

Fix:
1. Create src/components/ErrorBoundary.tsx — a class component that catches errors
   in its children:
   - Display a fallback UI with the error message and a "Try Again" button
   - The "Try Again" button resets the error state so children re-mount
   - Style it consistently with the app's glass/card design
   - Log errors to console.error for debugging
2. Wrap SearchTab's render output in <ErrorBoundary> inside the component itself
   (around the main content, not the entire tab).
3. Wrap CandidateProfile's render output in <ErrorBoundary>.
4. Wrap CandidateSlideOut's render output in <ErrorBoundary>.
5. Do NOT wrap the entire app in an error boundary — keep them granular so only
   the failing section resets.

Verify: npx tsc --noEmit && npx vite build
Commit with message: "P7: Add granular error boundaries around SearchTab and CandidateProfile"
```

---

### Prompt 8: Add missing database indexes for user_id columns

```
The BUG-01 fix (migration 20260303000000) added user_id to 7 tables but only created
indexes for some. RLS policies filter by auth.uid() = user_id, so missing indexes
cause sequential scans.

Create a new migration: supabase/migrations/20260303600001_add_missing_indexes.sql

Add the following indexes:
1. CREATE INDEX IF NOT EXISTS idx_outreach_history_user_id ON public.outreach_history(user_id);
2. CREATE INDEX IF NOT EXISTS idx_outreach_history_created_at ON public.outreach_history(created_at DESC);
3. CREATE INDEX IF NOT EXISTS idx_search_results_user_id ON public.search_results(user_id);
4. CREATE INDEX IF NOT EXISTS idx_pipeline_events_user_id ON public.pipeline_events(user_id);
5. CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_sequence_id ON public.sequence_enrollments(sequence_id);
6. CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_pipeline_id ON public.sequence_enrollments(pipeline_id);
7. CREATE INDEX IF NOT EXISTS idx_outreach_events_enrollment_id ON public.outreach_events(enrollment_id);
8. Composite indexes for common pagination patterns:
   CREATE INDEX IF NOT EXISTS idx_pipeline_user_created ON public.pipeline(user_id, created_at DESC);
   CREATE INDEX IF NOT EXISTS idx_search_history_user_created ON public.search_history(user_id, created_at DESC);

Also update full-schema.sql with all new indexes.

Commit with message: "P8: Add missing database indexes on user_id and FK columns"
```

---

### Prompt 9: Fix EEA bioContains false positives with word boundary matching

```
In src/lib/eea.ts, the bioContains function (lines 120-122) uses bare string.includes()
without word boundaries. This causes false positives: checking for 'cto' matches
"factor", "vector"; 'react' matches "reactive"; 'google' matches "googleplex".

Fix:
1. Replace the bioContains function with a word-boundary version:
   function bioContains(bio: string, words: string[]): boolean {
     const lower = bio.toLowerCase();
     return words.some(w => {
       const regex = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
       return regex.test(lower);
     });
   }
2. Also fix the organization name matching at line 219 and title matching at line 204
   to use the same word-boundary approach.
3. Review all calls to bioContains in the file and verify the fix doesn't break
   any existing tests. The EEA test suite has 52 tests — all must still pass.
4. Add 2-3 test cases in src/lib/__tests__/eea.test.ts that verify:
   - 'cto' does NOT match "factor" or "vector"
   - 'cto' DOES match "CTO" and "cto at startup"
   - 'react' does NOT match "reactive programming"

Verify: npx vitest run src/lib/__tests__/eea.test.ts
Commit with message: "P9: Fix EEA bioContains false positives with word boundary matching"
```

---

### Prompt 10: Add webhook error feedback and per-user rate limiting on AI endpoints

```
Two issues in one prompt:

PART A — Webhook error feedback:
In src/lib/api.ts line 239, notifyStageChange fires .catch(() => {}) — webhook failures
are completely invisible to users.

Fix:
1. Change notifyStageChange to return the promise instead of fire-and-forget.
2. In PipelineTab.tsx where notifyStageChange is called, await it in a try/catch and
   show a warning toast on failure: "Webhook notification failed — check your settings"
3. Keep the notification non-blocking — don't prevent the stage change from completing.

PART B — Rate limiting on AI endpoints:
The edge functions parse-nl-query, generate-outreach, and research-role all call the
Anthropic API without per-user rate limiting. A single user can make unlimited calls.

Fix:
1. Create supabase/functions/_shared/rate-limit.ts with a simple token-bucket limiter
   using Supabase table or in-memory Map:
   - checkRateLimit(userId: string, action: string, maxPerMinute: number): { allowed: boolean, retryAfterSeconds?: number }
   - Use a simple approach: store last N timestamps in a Map, evict old entries.
2. Add rate limiting to parse-nl-query (10/min), generate-outreach (5/min), and
   research-role (3/min).
3. Return 429 status with Retry-After header when rate limited.

Verify: npx tsc --noEmit (for frontend changes)
Commit with message: "P10: Add webhook error feedback and per-user rate limiting on AI endpoints"
```

---

## Summary Matrix

| # | Category | Severity | Effort | Area |
|---|----------|----------|--------|------|
| P1 | Bug: Memory leak | CRITICAL | Medium | Hooks / API |
| P2 | Security: CORS bypass | HIGH | Small | Edge Functions |
| P3 | Schema drift | HIGH | Medium | Database |
| P4 | Security: RLS gaps | HIGH | Small | Database |
| P5 | Bug: Memory leak | MEDIUM | Small | Hooks |
| P6 | Performance | MEDIUM | Medium | Components |
| P7 | Reliability | MEDIUM | Medium | Components |
| P8 | Performance: DB | MEDIUM | Small | Database |
| P9 | Bug: Scoring accuracy | MEDIUM | Small | Lib |
| P10 | UX + Security | LOW-MED | Medium | API + Edge Functions |
