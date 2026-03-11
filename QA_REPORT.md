# SourceProof / SourceKit — Full QA & Workflow Report

**Date:** 2026-03-03
**Branch:** `claude/sourceproof-qa-features-QTIRm`
**Build Status:** Passing (118/118 tests, TypeScript clean, Vite build OK)
**ESLint:** 79 errors, 11 warnings (mostly `@typescript-eslint/no-explicit-any`)

---

## QA Summary

| Category | Count |
|----------|-------|
| Critical security issues | 6 |
| High-severity bugs | 8 |
| Medium-severity issues | 15+ |
| Low-severity / code quality | 20+ |
| Total ESLint violations | 90 |

---

## TOP 10 BUG FIXES & WORKFLOW IMPROVEMENTS

### BUG-01: Wide-Open Row Level Security — Any User Can Read/Delete All Data

**Severity:** CRITICAL
**Impact:** All pipeline, search history, watchlist, outreach, and settings data is accessible and modifiable by any unauthenticated user. This is the single most dangerous issue in the codebase.

**Files:**
- `supabase/full-schema.sql` (lines 77-80, 97-99, 115-117, 135-138, 152-154)

**Problem:** Every RLS policy uses `USING (true)` / `WITH CHECK (true)`, meaning zero access control. The `pipeline`, `outreach_history`, `search_history`, `watchlist_items`, and `settings` tables are completely public. The `candidates` table also exposes email addresses and LinkedIn URLs publicly.

**Fix:** Replace every `USING (true)` policy with `USING (auth.uid() = user_id)` after adding a `user_id` column to tables that lack one.

---

### BUG-02: Authentication Gate Allows Anonymous Bypass of Trial Limits

**Severity:** CRITICAL
**Impact:** The search rate-limiting gate (`_shared/gate.ts`) returns `allowed: true` when no auth header is sent OR when an invalid token is sent. Any user can bypass trial limits by simply omitting the Authorization header.

**Files:**
- `supabase/functions/_shared/gate.ts` (lines 28-31, 37-39)

**Problem:**
```typescript
if (!authHeader || authHeader === `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`) {
  return { allowed: true, userId: null, plan: null }; // BUG: allows unauthenticated through
}
if (authError || !user) {
  return { allowed: true, userId: null, plan: null }; // BUG: allows invalid tokens through
}
```

**Fix:** Return `{ allowed: false }` for unauthenticated/invalid requests, or at minimum apply a separate rate limit for anonymous users.

---

### BUG-03: SSRF Vulnerability in `parse-jd` Function

**Severity:** CRITICAL
**Impact:** The job description URL parser accepts arbitrary URLs and fetches them server-side without blocking private IP ranges. An attacker can probe internal infrastructure, access cloud metadata endpoints (`169.254.169.254`), or scan internal services.

**Files:**
- `supabase/functions/parse-jd/index.ts` (lines 86-128)

**Problem:** Only validates `http:`/`https:` protocol but doesn't block internal/private IP ranges, localhost, or metadata endpoints.

**Fix:** Add IP range validation, DNS resolution check, and URL allowlist/blocklist before fetching.

---

### BUG-04: `hideUngettable` Filter Silently Dropped — Search Option Logic Bug

**Severity:** HIGH
**Impact:** When a user toggles "Hide Ungettable Candidates" ON, the option (`hideUngettable: true`) fails the truthiness check in `api.ts` and is silently dropped, falling through to a GET request that cannot carry the structured body. The filter never actually works.

**Files:**
- `src/lib/api.ts` (lines 62-66)

**Problem:**
```typescript
const hasOptions = options && (
  options.targetRepos?.length ||
  options.skills?.length ||
  options.hideUngettable === false  // BUG: only true when explicitly false
);
```

**Fix:** Change to `options.hideUngettable !== undefined` or `'hideUngettable' in options`.

---

### BUG-05: `DeveloperProfile` Crashes on Missing `topLanguages`

**Severity:** HIGH
**Impact:** If the API returns a developer without `topLanguages` (null or undefined), the page crashes with `TypeError: Cannot read properties of null (reading 'map')`. This is a production crash for any developer profile missing this field.

**Files:**
- `src/pages/DeveloperProfile.tsx` (line 324)

**Problem:** `developer.topLanguages.map(...)` called without null guard, unlike every other array property which uses `|| []`.

**Fix:** Change to `(developer.topLanguages || []).map(...)`.

---

### BUG-06: OnboardingCard Dismiss Doesn't Work (Same-Tab localStorage Event)

**Severity:** HIGH
**Impact:** Clicking "dismiss" on the onboarding card sets localStorage and dispatches a `storage` event, but `storage` events only fire in OTHER tabs. The card never disappears until a parent re-render happens by coincidence.

**Files:**
- `src/components/search/OnboardingCard.tsx` (lines 4-8)

**Problem:** Uses `window.dispatchEvent(new Event("storage"))` which doesn't trigger in the same tab. The component reads localStorage directly in the render path (not in state), so it has no mechanism to re-render.

**Fix:** Use `useState` initialized from localStorage, and set the state when dismissing.

---

### BUG-07: Saved Search Bookmark Toggle Only Saves, Never Deletes

**Severity:** MEDIUM
**Impact:** The bookmark button visually toggles between saved/unsaved states, but clicking it when already saved calls `saveSearch` again (creating a duplicate) instead of calling `deleteSearch`. Users cannot un-save a search.

**Files:**
- `src/components/SearchTab.tsx` (lines 91-94)

**Problem:** `handleSaveSearch` always calls `saveSearch()` regardless of the `isSaved` state.

**Fix:** Check `isSaved(query)` and call `deleteSearch` when true, `saveSearch` when false.

---

### BUG-08: Pipeline Notes Double-Save Race (Debounce + onBlur)

**Severity:** MEDIUM
**Impact:** When a user types in the notes field and then clicks away, both the debounced timeout AND the blur handler fire, causing a duplicate database mutation. This can corrupt notes or cause optimistic update flicker.

**Files:**
- `src/components/PipelineTab.tsx` (lines 533-545)

**Problem:** `handleNotesBlur` fires immediately, but the debounced `handleNotesInput` timeout is not cleared on blur, so it fires 500ms later.

**Fix:** Clear `debounceRef.current` in the blur handler before saving.

---

### BUG-09: CSV Export Vulnerable to Formula Injection

**Severity:** MEDIUM (Security)
**Impact:** Exported CSV data can contain formula injection payloads. If a candidate's bio or name starts with `=`, `+`, `-`, or `@`, opening the CSV in Excel/Sheets could execute arbitrary formulas.

**Files:**
- `src/lib/csv-export.ts` (lines 40-45)

**Problem:** The `escape` function handles commas, quotes, and newlines but doesn't sanitize formula-triggering characters.

**Fix:** Prefix values starting with `=`, `+`, `-`, `@`, `\t`, `\r` with a single quote or tab character.

---

### BUG-10: Schema/Type Drift — Multiple Tables Referenced in Code Don't Exist

**Severity:** HIGH
**Impact:** Edge functions reference tables (`search_results`, `pipeline_events`, `webset_mappings`, `pipeline_candidates`) and columns (`query_hash`, `linkedin_fetched_at`) that don't exist in the SQL schema. These operations silently fail at runtime, breaking caching, event tracking, and webset management.

**Files:**
- `supabase/functions/github-search/index.ts` (lines 404, 496, 773)
- `supabase/functions/notify-pipeline-change/index.ts` (line 127)
- `supabase/functions/exa-websets/index.ts` (lines 87, 101, 197, 212, 326)
- `supabase/functions/enrich-linkedin/index.ts` (lines 25, 30, 126)
- `supabase/full-schema.sql` vs `src/integrations/supabase/types.ts`

**Fix:** Either add the missing tables/columns to `full-schema.sql` via a new migration, or remove the dead references from edge function code.

---

## TOP 5 NEW FEATURES

### FEATURE-01: Real-Time Collaborative Pipeline with Presence

**Value:** Transform the single-user pipeline into a team tool. Multiple recruiters can see who is viewing/editing which candidates in real-time, preventing duplicate outreach and enabling team coordination.

**Scope:** Supabase Realtime channels for presence, pipeline mutations broadcast, cursor/avatar indicators on pipeline cards, conflict resolution for simultaneous edits.

---

### FEATURE-02: AI-Powered Candidate Matching Score Explanation & Recommendations

**Value:** Currently, scores are opaque numbers. Provide an interactive breakdown showing WHY a candidate scored high/low, which skills matched, what's missing, and suggest similar candidates who might be a better fit. Turns a passive leaderboard into an actionable intelligence tool.

**Scope:** Score explanation panel in CandidateSlideOut, "Similar Candidates" section powered by embedding similarity, skill gap analysis visualization, and a "Why this score?" tooltip on every score badge.

---

### FEATURE-03: Automated Candidate Tracking Pipeline with Email Sequences

**Value:** Replace the manual "Generate Outreach → Copy → Paste" workflow with an automated multi-step email sequence. Schedule follow-ups, track opens/replies, and auto-advance pipeline stages based on response signals. This is the #1 feature gap vs. competing recruiting tools.

**Scope:** Email integration (SendGrid/Resend), sequence builder UI, open/click tracking, auto-stage-advancement rules, reply detection, and a "Sequences" tab in the pipeline view.

---

### FEATURE-04: GitHub Activity Heatmap & Contribution Timeline

**Value:** Go beyond static profile snapshots. Show a visual timeline of a candidate's contribution patterns — commit frequency, PR cadence, issue engagement, and activity trends over the past 12 months. Helps recruiters assess candidate availability, engagement level, and growth trajectory at a glance.

**Scope:** GitHub Events API integration, D3/Recharts heatmap component, activity trend sparklines on DeveloperCard, and a detailed timeline in CandidateProfile.

---

### FEATURE-05: Smart Search with Natural Language & Saved Search Alerts

**Value:** Let recruiters type natural language queries like "Senior React developer in NYC with open source contributions" and have AI parse it into structured filters. Plus, save searches with email/Slack alerts when new candidates match — turning passive searching into proactive talent monitoring.

**Scope:** NLP query parser (Claude API), search-to-filter translation, scheduled search execution (Supabase cron), notification delivery (email + Slack), and an "Alerts" management UI.

---

## CLAUDE CODE PROMPTS

Each prompt below is ready to paste into Claude Code. They are self-contained with full context.

---

### PROMPT 01: Fix Wide-Open RLS Policies

```
Review the file `supabase/full-schema.sql` and all migration files in `supabase/migrations/`.

PROBLEM: Every RLS policy in the schema uses `USING (true)` and `WITH CHECK (true)`, meaning any anonymous or authenticated user can read, insert, update, and delete ALL rows in the `pipeline`, `outreach_history`, `search_history`, `watchlist_items`, `settings`, and `candidates` tables. This is a critical security vulnerability.

TASKS:
1. Create a new migration file `supabase/migrations/20260303000000_fix_rls_policies.sql` that:
   a. Adds a `user_id UUID REFERENCES auth.users(id)` column (with DEFAULT auth.uid()) to any table that lacks one: `pipeline`, `outreach_history`, `search_history`, `watchlist_items`, `candidates`
   b. Drops all existing `USING (true)` policies
   c. Creates new policies scoped to `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE on each table
   d. For the `candidates` table, keep a public SELECT policy but EXCLUDE the `email` and `linkedin_url` columns from public access (create a view or use column-level security)
   e. For the `settings` table (which already has `user_id` in the migration `20260301900000`), fix the RLS to use `auth.uid() = user_id`
2. Update `supabase/full-schema.sql` to reflect the corrected schema
3. Verify no edge functions break by checking all `supabase.from(...)` calls across `supabase/functions/` — any that use the service role key will bypass RLS (which is correct for server-side operations), but client-side calls need the user context

Do NOT modify any frontend React components. Only modify SQL migrations, full-schema.sql, and edge functions if needed.
```

---

### PROMPT 02: Fix Auth Gate Bypass

```
Review `supabase/functions/_shared/gate.ts`.

PROBLEM: The `checkSearchGate` function returns `{ allowed: true }` when:
1. No Authorization header is present (line 28-31)
2. An invalid/expired token is provided (line 37-39)

This means any unauthenticated user can bypass trial search limits entirely.

TASKS:
1. In `gate.ts`, change the behavior so:
   - If no auth header or only the anon key is provided: apply a stricter anonymous rate limit (e.g., 3 searches per IP per day via a simple check, or return `{ allowed: false, reason: 'auth_required' }`)
   - If an invalid token is provided: return `{ allowed: false, reason: 'invalid_token' }`
   - Keep the existing behavior for valid authenticated users (trial limits, pro bypass)
2. Update `supabase/functions/github-search/index.ts` to handle the new `allowed: false` cases and return appropriate HTTP status codes (401 for auth_required, 403 for limit_reached)
3. Review all other edge functions that SHOULD require authentication (`bulk-actions`, `generate-outreach`, `enrich-linkedin`, `notify-pipeline-change`, `exa-websets` delete action) and add a basic auth check at the top of each handler:
   ```typescript
   const authHeader = req.headers.get('Authorization');
   if (!authHeader || authHeader === `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`) {
     return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: corsHeaders });
   }
   ```
4. Run the existing tests to make sure nothing breaks: `npx vitest run`
```

---

### PROMPT 03: Fix SSRF in parse-jd

```
Review `supabase/functions/parse-jd/index.ts`.

PROBLEM: The function accepts a user-provided URL (line 86) and fetches it server-side without blocking private/internal IP ranges. This is a Server-Side Request Forgery (SSRF) vulnerability that could be exploited to access cloud metadata endpoints, internal services, or localhost.

TASKS:
1. Create a `supabase/functions/_shared/url-validator.ts` utility with a `validateExternalUrl(url: string): { valid: boolean; error?: string }` function that:
   - Validates the URL is well-formed
   - Ensures protocol is `http:` or `https:`
   - Resolves the hostname to an IP address using Deno's DNS API or a regex check
   - Blocks private IP ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`, `::1`, `fc00::/7`
   - Blocks the AWS/GCP/Azure metadata endpoints: `169.254.169.254`, `metadata.google.internal`
   - Blocks `localhost`, `0.0.0.0`
   - Returns a clear error message for blocked URLs
2. Apply `validateExternalUrl` in `parse-jd/index.ts` before the `fetch(url, ...)` call
3. Also apply it in `notify-pipeline-change/index.ts` before sending to webhook URLs (lines 65-89)
4. Remove the `parallel_api_key` passthrough from `parse-jd/index.ts` (line 76) — the server should ONLY use its own `PARALLEL_API_KEY` from environment, never accept API keys from the client
```

---

### PROMPT 04: Fix hideUngettable Filter Logic Bug

```
Review `src/lib/api.ts` lines 60-75.

PROBLEM: The `hasOptions` check on line 62-66 determines whether to use POST (with body) or GET for the search API call. The check for `hideUngettable` is:
```typescript
options.hideUngettable === false
```
This only evaluates to true when `hideUngettable` is explicitly `false`. When the user enables "Hide Ungettable" (`hideUngettable: true`), the check evaluates to `false`, so the option is silently dropped and the GET path is used instead. The filter never works.

TASKS:
1. In `src/lib/api.ts`, change line 65 from:
   `options.hideUngettable === false`
   to:
   `options.hideUngettable !== undefined`
2. Verify the fix by tracing the data flow:
   - `src/hooks/useSearchQuery.ts` — find where `hideUngettable` is passed to `searchDevelopers` or `searchDevelopersStreaming`
   - `src/components/SearchTab.tsx` — find where the "show ungettable" toggle state is managed and confirm it maps correctly to the API option
3. Add a test case to `src/lib/__tests__/api.test.ts` that verifies:
   - When `hideUngettable: true` is passed, the function uses POST method
   - When `hideUngettable: false` is passed, the function uses POST method
   - When `hideUngettable` is undefined, the existing behavior is preserved
4. Run `npx vitest run` to confirm all tests pass
```

---

### PROMPT 05: Fix DeveloperProfile Crashes

```
Review `src/pages/DeveloperProfile.tsx`.

PROBLEM: Multiple potential crashes from unsafe property access:
1. Line 324: `developer.topLanguages.map(...)` — crashes if `topLanguages` is null/undefined (unlike other arrays which use `|| []`)
2. Line 487: `new URL(link.url).hostname` — crashes if `link.url` is malformed
3. Lines 201-212 and 479-492: Contact links section is rendered twice (hero and "Links" divider)

TASKS:
1. Add null guard on line 324: change `developer.topLanguages.map(...)` to `(developer.topLanguages || []).map(...)`
2. Wrap the `new URL(link.url)` call on line 487 in a try/catch or use a helper function:
   ```typescript
   const getHostname = (url: string) => {
     try { return new URL(url).hostname; } catch { return url; }
   };
   ```
3. Remove the duplicate contact links section (lines 479-492, the "Links Divider" section) since the same links already appear in the hero section (lines 201-212)
4. Also check for similar `new URL()` crash risks in:
   - `src/components/WebsetsTab.tsx` lines 38, 64
   - Add try/catch guards there too
5. Run `npx vitest run` and `npx tsc --noEmit` to verify
```

---

### PROMPT 06: Fix OnboardingCard Dismiss and Saved Search Toggle

```
TWO related UX bugs to fix:

BUG A — OnboardingCard dismiss doesn't work:
File: `src/components/search/OnboardingCard.tsx`
PROBLEM: The dismiss button sets localStorage and dispatches a `storage` event, but the `storage` event only fires in OTHER browser tabs. The component reads localStorage directly in the render function (not via React state), so it never re-renders to hide itself.

FIX: Convert to use `useState` initialized from localStorage:
```typescript
const OnboardingCard = () => {
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem("sourcekit-gs-onboarding-dismissed")
  );
  if (dismissed) return null;
  // ... rest of component
  // In onClick:
  onClick={() => {
    localStorage.setItem("sourcekit-gs-onboarding-dismissed", "1");
    setDismissed(true);
  }}
```

BUG B — Saved search bookmark only saves, never un-saves:
File: `src/components/SearchTab.tsx` (lines 91-94)
PROBLEM: `handleSaveSearch` always calls `saveSearch()` regardless of `isSaved` state. The button icon toggles visually but clicking when saved re-saves instead of deleting.

FIX: Make `handleSaveSearch` toggle:
```typescript
const handleSaveSearch = () => {
  if (isSaved(query)) {
    const existing = savedSearches.find(s => s.query === query);
    if (existing) deleteSearch(existing.id);
  } else {
    saveSearch(query, filters);
  }
};
```
Find where `isSaved`, `saveSearch`, `deleteSearch`, `savedSearches`, `query`, and `filters` are defined in the component and adjust accordingly.

Run `npx vitest run` after both fixes.
```

---

### PROMPT 07: Fix Pipeline Notes Double-Save and Add Missing Error Handling

```
Review `src/components/PipelineTab.tsx`.

PROBLEM 1 — Double-save race condition (lines 533-545):
The `handleNotesBlur` fires immediately on blur, but the debounced `handleNotesInput` timeout is NOT cleared, so it fires 500ms later — causing a duplicate mutation.

FIX: In `handleNotesBlur`, clear the debounce timeout:
```typescript
const handleNotesBlur = () => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  if (notesValue !== (c.notes || "")) {
    onNotesChange(notesValue);
  }
};
```

Also add a cleanup useEffect for the debounce ref to prevent memory leaks on unmount:
```typescript
useEffect(() => {
  return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
}, []);
```

PROBLEM 2 — `PipelineCandidate` type missing `eea_data` (line 604):
The code accesses `c.eea_data` but the `PipelineCandidate` interface (lines 39-49) doesn't include it. Add `eea_data?: { strength: string; enrichments: string[] } | null;` to the interface.

PROBLEM 3 — Unnecessary `(c as any).tags` cast (line 526):
The interface already defines `tags: string[]`. Change to `const tags: string[] = c.tags || [];` and update the interface to `tags: string[] | null` to match DB reality.

PROBLEM 4 — Dead code: `SUPABASE_URL` and `SUPABASE_KEY` declared on lines 15-16 but never used. Remove them.

Run `npx vitest run` and `npx tsc --noEmit` after all fixes.
```

---

### PROMPT 08: Fix CSV Formula Injection Security Vulnerability

```
Review `src/lib/csv-export.ts`.

PROBLEM: The `escape` function (lines 40-45) handles commas, quotes, and newlines but does NOT protect against CSV formula injection. If any field value starts with `=`, `+`, `-`, or `@`, it will be interpreted as a formula by Excel/Google Sheets when opened. A malicious candidate bio like `=CMD("calc")` could execute arbitrary code on a recruiter's machine.

TASKS:
1. Update the `escape` function in `src/lib/csv-export.ts` to detect and neutralize formula injection:
   - If a value starts with `=`, `+`, `-`, `@`, `\t`, or `\r`, prefix it with a single quote `'` (which Excel treats as a text prefix)
   - Apply this check BEFORE the existing comma/quote/newline handling
2. Add test cases to `src/lib/__tests__/csv-export.test.ts`:
   - Test that `=CMD("calc")` is escaped to `'=CMD("calc")`
   - Test that `+1234567890` is escaped to `'+1234567890`
   - Test that `-@SUM(A1:A10)` is escaped to `'-@SUM(A1:A10)`
   - Test that normal values like `John Smith` and `85` are NOT prefixed
3. Run `npx vitest run` to verify all tests pass
```

---

### PROMPT 09: Fix Schema/Type Drift — Add Missing Tables and Columns

```
Review the drift between `supabase/full-schema.sql`, `src/integrations/supabase/types.ts`, and the edge functions in `supabase/functions/`.

PROBLEM: Multiple edge functions reference tables and columns that don't exist in `full-schema.sql`:
- `search_results` table (used in `github-search/index.ts` line 773)
- `pipeline_events` table (used in `notify-pipeline-change/index.ts` line 127)
- `query_hash` column on `candidates` (used in `github-search/index.ts` lines 404, 496)
- `linkedin_fetched_at` column on `candidates` (used in `enrich-linkedin/index.ts` lines 25, 30, 126)

Note: Some of these tables ARE defined in individual migration files (check `supabase/migrations/`) but were never added to `full-schema.sql`.

TASKS:
1. Audit ALL migration files in `supabase/migrations/` to find which tables/columns they create
2. Create a comprehensive migration `supabase/migrations/20260303100000_sync_schema.sql` that adds any tables/columns that exist in migrations but are missing from `full-schema.sql`:
   - `search_results` (check migration `20260301100000_create_search_results.sql`)
   - `pipeline_events` (check migration `20260301400000_create_pipeline_events.sql`)
   - `saved_searches` (check migration `20260301500000_create_saved_searches.sql`)
   - `eea_signal_templates` (check migration `20260301600000_create_eea_signal_templates.sql`)
   - `webset_refs` (check migration `20260301800000_create_webset_refs.sql`)
   - `query_hash` column on candidates
   - `linkedin_fetched_at` column on candidates
   - Any other drift you find
3. Update `supabase/full-schema.sql` to be the complete, authoritative schema (union of original schema + all migrations)
4. Do NOT modify TypeScript types or edge function code — only SQL files
```

---

### PROMPT 10: Fix Pervasive Missing Error Handling Across Supabase Mutations

```
PROBLEM: Throughout the frontend, Supabase mutations ignore error returns, causing silent data loss and UI/DB state divergence. The pattern is:
```typescript
const { data } = await supabase.from("table").update({...}).eq("id", id);
// Error is destructured away — if update fails, user sees success but DB is unchanged
```

TASKS — Fix error handling in these specific locations:

1. `src/components/CandidateProfile.tsx`:
   - Line ~114: `handleStageChange` — add error check after `.update()`, rollback `localStage` on error, show error toast
   - Line ~144: outreach history insert — check error, show toast on failure
   - Line ~149: Add cleanup for the 15-second `setTimeout` (return cleanup function from useEffect or store ref)

2. `src/components/CandidateSlideOut.tsx`:
   - Line ~167: `handleStageChange` — add error check, rollback on failure
   - Line ~244: `handleSaveNotes` — check error, show "Failed to save notes" toast
   - Lines ~264-275: `handleAddTag`/`handleRemoveTag` — check errors, rollback local state

3. `src/components/SearchTab.tsx`:
   - Lines ~247-277: `handleBatchAddToPipeline` — wrap the entire function in try/finally with `setBatchAdding(false)` in finally block to prevent permanent disabled state

4. `src/components/UpgradeModal.tsx`:
   - Lines ~40-43: Add user-visible error toast in the catch block instead of just `console.error`

5. `src/components/HistoryTab.tsx`:
   - Line ~60: "Clear All" — replace the sentinel UUID hack `neq("id", "00000000...")` with proper user-scoped deletion (after RLS is fixed)

Pattern to use for all fixes:
```typescript
const { error } = await supabase.from("table").update({...}).eq("id", id);
if (error) {
  toast({ title: "Failed to update", description: error.message, variant: "destructive" });
  // rollback optimistic state if applicable
  return;
}
```

Run `npx vitest run` and `npx tsc --noEmit` after all fixes.
```

---

## NEW FEATURE PROMPTS

### PROMPT F1: Real-Time Collaborative Pipeline with Presence

```
Implement real-time collaboration for the pipeline/kanban board using Supabase Realtime.

CONTEXT: SourceKit is a developer recruiting tool. The pipeline (`PipelineTab.tsx`) is a kanban board where recruiters drag candidates between stages (sourced → screening → interview → offer → hired). Currently it's single-user with no real-time sync.

REQUIREMENTS:
1. **Realtime Pipeline Sync**: When any user moves a candidate to a different stage, adds notes, or removes a candidate, ALL connected users see the change instantly without refreshing.

2. **Presence Indicators**: Show small avatar bubbles on pipeline cards that other users are currently viewing/editing. When a user hovers over or opens a candidate's details, their avatar appears on that card for all other users.

3. **Conflict Prevention**: If two users try to move the same candidate simultaneously, the second user should see a toast: "This candidate was just moved by [name]. Refreshing..." and the board should auto-refresh.

IMPLEMENTATION PLAN:
1. Create `src/hooks/usePipelineRealtime.ts`:
   - Subscribe to Supabase Realtime channel `pipeline-changes` for INSERT/UPDATE/DELETE on the `pipeline` table
   - On receiving a change, invalidate the React Query cache for `["pipeline"]`
   - Subscribe to presence channel `pipeline-presence` to track which users are viewing which candidates
   - Expose `trackViewing(candidateId)` and `stopViewing(candidateId)` functions
   - Expose `presenceState` map of `{ candidateId: User[] }`

2. Modify `src/components/PipelineTab.tsx`:
   - Import and use `usePipelineRealtime`
   - Add presence avatars to each pipeline card (small circular avatars in top-right corner)
   - On drag-and-drop, check if the candidate's `updated_at` has changed since last fetch (optimistic concurrency control)

3. Create `src/components/pipeline/PresenceAvatars.tsx`:
   - Renders up to 3 small avatar circles with a "+N" overflow indicator
   - Tooltips showing usernames on hover
   - Subtle pulse animation for active editors

4. Add a new migration `supabase/migrations/20260303200000_add_pipeline_updated_at.sql`:
   - Add `updated_at TIMESTAMPTZ DEFAULT now()` to the `pipeline` table
   - Create a trigger that auto-updates `updated_at` on any row change

FILES TO CREATE: `src/hooks/usePipelineRealtime.ts`, `src/components/pipeline/PresenceAvatars.tsx`, `supabase/migrations/20260303200000_add_pipeline_updated_at.sql`
FILES TO MODIFY: `src/components/PipelineTab.tsx`

Run `npx vitest run` and `npx tsc --noEmit` after implementation.
```

---

### PROMPT F2: AI Score Explanation & Candidate Recommendations

```
Add an interactive AI score explanation panel and "Similar Candidates" recommendations.

CONTEXT: SourceKit scores developer candidates on a 0-100 scale using AI analysis of their GitHub profiles. Currently the score is an opaque number — recruiters can't see WHY a candidate scored high or low, making it hard to trust or act on.

REQUIREMENTS:
1. **Score Breakdown Panel**: When clicking a candidate's score badge anywhere in the app, show a slide-out panel with:
   - Overall score with a visual gauge
   - Category breakdown: Technical Skills (0-25), Experience & Impact (0-25), Activity & Engagement (0-25), Cultural Fit Signals (0-25)
   - For each category: 2-3 specific evidence points pulled from the candidate's profile (e.g., "Maintains 3 repos with 500+ stars", "Active contributor to React ecosystem")
   - Skill match percentage against the job requirements (if a research strategy is active)
   - "What's Missing" section highlighting gaps

2. **Similar Candidates**: Below the score breakdown, show 3-5 similar candidates from the same search results, ranked by profile similarity (based on overlapping skills, languages, and contribution patterns). Each shows name, score, and a 1-line reason why they're similar.

3. **"Why This Score?" Tooltip**: Add a small info icon next to every score display (DeveloperCard, PipelineTab, CandidateProfile, CandidateSlideOut, BulkActionsTab) that shows a condensed 2-line explanation on hover.

IMPLEMENTATION:
1. Create `src/components/ScoreExplanation.tsx`:
   - Accepts `developer: Developer` and `strategy?: StrategyHandoff` props
   - Renders the breakdown panel with animated progress bars
   - Uses the existing `computeSkillMatch` from `search-helpers.ts` for skill matching
   - Parses the `summary` and `about` fields (already populated by the AI scoring in `github-search`) to extract evidence points

2. Create `src/components/SimilarCandidates.tsx`:
   - Accepts `developer: Developer` and `allCandidates: Developer[]`
   - Computes similarity based on language overlap, skill overlap, and score proximity
   - Renders compact candidate cards with click-to-navigate

3. Create `src/hooks/useScoreExplanation.ts`:
   - Manages the open/closed state of the explanation panel
   - Provides `openExplanation(developer)` function
   - Parses score into categories (derive from existing scoring logic in `github-search/index.ts`)

4. Modify existing components to add the info icon and click handler:
   - `src/components/DeveloperCard.tsx` — score badge
   - `src/components/PipelineTab.tsx` — score column
   - `src/components/CandidateSlideOut.tsx` — score display

Run `npx vitest run` and `npx tsc --noEmit` after implementation.
```

---

### PROMPT F3: Automated Email Sequences for Candidate Outreach

```
Implement automated multi-step email sequences for candidate outreach.

CONTEXT: SourceKit generates outreach messages via AI but requires recruiters to manually copy/paste them. This prompt adds automated email delivery with sequences, tracking, and auto-stage-advancement.

REQUIREMENTS:
1. **Sequence Builder**: A new "Sequences" section in the pipeline where recruiters can:
   - Create multi-step email sequences (e.g., Initial Outreach → Follow-up 1 (3 days) → Follow-up 2 (5 days) → Final (7 days))
   - Each step has: subject, body template (with {{firstName}}, {{company}}, {{role}} variables), and delay in days
   - Pre-built sequence templates (Cold Outreach, Warm Introduction, Conference Follow-up)

2. **Email Integration**: Use Resend API (simpler than SendGrid for transactional email):
   - New edge function `supabase/functions/send-outreach/index.ts`
   - Sends emails with open/click tracking pixels
   - Records delivery status in `outreach_history` table

3. **Sequence Execution**:
   - When a recruiter enrolls a candidate in a sequence, schedule all steps
   - A Supabase cron job (or pg_cron) checks every hour for pending emails
   - If a candidate replies (detected via webhook), stop the sequence and auto-advance to "screening" stage
   - Show sequence progress on the pipeline card (step 2/4, next send in 2d)

4. **Tracking Dashboard**:
   - New `src/components/pipeline/SequenceStatus.tsx` component
   - Shows: emails sent, opens, clicks, replies, bounce rate
   - Per-candidate: current step, last activity, response status

IMPLEMENTATION:
1. Create schema migration `supabase/migrations/20260303300000_email_sequences.sql`:
   ```sql
   CREATE TABLE outreach_sequences (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id),
     name TEXT NOT NULL,
     steps JSONB NOT NULL, -- [{subject, body, delay_days}]
     created_at TIMESTAMPTZ DEFAULT now()
   );
   CREATE TABLE sequence_enrollments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     sequence_id UUID REFERENCES outreach_sequences(id),
     candidate_id UUID REFERENCES pipeline(id),
     current_step INT DEFAULT 0,
     status TEXT DEFAULT 'active', -- active, paused, completed, replied
     next_send_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   CREATE TABLE outreach_events (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     enrollment_id UUID REFERENCES sequence_enrollments(id),
     event_type TEXT NOT NULL, -- sent, opened, clicked, replied, bounced
     metadata JSONB,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

2. Create `supabase/functions/send-outreach/index.ts` — Resend API integration
3. Create `src/components/pipeline/SequenceBuilder.tsx` — sequence creation UI
4. Create `src/components/pipeline/SequenceStatus.tsx` — per-candidate sequence progress
5. Create `src/hooks/useSequences.ts` — React Query hooks for sequences
6. Modify `src/components/PipelineTab.tsx` — add sequence enrollment button to pipeline cards

Run `npx vitest run` and `npx tsc --noEmit` after implementation.
```

---

### PROMPT F4: GitHub Activity Heatmap & Contribution Timeline

```
Add a visual GitHub activity heatmap and contribution timeline to candidate profiles.

CONTEXT: SourceKit shows static GitHub profile data (repos, stars, languages) but doesn't visualize contribution patterns over time. Recruiters need to quickly assess a candidate's activity level, consistency, and recent engagement.

REQUIREMENTS:
1. **Activity Heatmap**: A GitHub-style contribution heatmap (green squares grid) showing daily commit activity for the past 12 months. Display on the CandidateProfile page and a mini version (last 3 months) on DeveloperCard hover.

2. **Contribution Timeline**: A vertical timeline showing key events:
   - Repository creation/major releases
   - Pull request spikes
   - Issue engagement patterns
   - Periods of high/low activity
   - Notable contributions (PRs merged to popular repos)

3. **Activity Sparkline**: A tiny inline sparkline (last 30 days of commits) next to each candidate's name in search results and pipeline cards. This gives an instant visual of "is this person actively coding?"

4. **Activity Score Component**: A derived "Activity Score" (0-100) based on:
   - Commit frequency (40%)
   - PR engagement (25%)
   - Consistency/streak (20%)
   - Recent vs historical ratio (15%)

IMPLEMENTATION:
1. Create `supabase/functions/github-activity/index.ts`:
   - Fetch contribution data from GitHub's GraphQL API (`contributionsCollection`)
   - Cache results in a new `github_activity_cache` table (TTL: 24 hours)
   - Return daily contribution counts, PR counts, and event timeline

2. Create schema migration `supabase/migrations/20260303400000_github_activity_cache.sql`:
   ```sql
   CREATE TABLE github_activity_cache (
     github_username TEXT PRIMARY KEY,
     contribution_data JSONB NOT NULL,
     fetched_at TIMESTAMPTZ DEFAULT now()
   );
   ```

3. Create `src/components/ActivityHeatmap.tsx`:
   - Renders a 52-week × 7-day grid of colored squares
   - Color intensity based on contribution count (0=gray, 1-3=light green, 4-7=medium, 8+=dark)
   - Tooltip on hover showing date and count
   - Uses pure CSS grid (no heavy charting library)

4. Create `src/components/ActivitySparkline.tsx`:
   - Tiny SVG sparkline (80px × 20px) showing 30-day commit trend
   - Green color when trending up, amber when flat, red when declining

5. Create `src/hooks/useGitHubActivity.ts`:
   - React Query hook calling the edge function
   - Computes the activity score from raw data

6. Modify existing components:
   - `src/pages/DeveloperProfile.tsx` — add full heatmap and timeline
   - `src/components/DeveloperCard.tsx` — add sparkline next to name
   - `src/components/PipelineTab.tsx` — add sparkline in candidate row

Run `npx vitest run` and `npx tsc --noEmit` after implementation.
```

---

### PROMPT F5: Natural Language Search with Saved Search Alerts

```
Add natural language search parsing and automated search alerts with notifications.

CONTEXT: SourceKit currently requires structured search queries (GitHub search syntax). Recruiters think in natural language: "Senior React developer in NYC with open source contributions who's worked at a FAANG company." This feature bridges that gap and adds proactive monitoring.

REQUIREMENTS:
1. **NL Query Parser**: When the user types a natural language query in the search bar:
   - Detect it's natural language (not GitHub search syntax) via heuristics
   - Send to Claude API to extract structured parameters: role, skills, location, seniority, target companies, must-have qualifications
   - Show the parsed interpretation below the search bar: "Searching for: Senior (seniority) React, Node.js (skills) developers in New York (location) with FAANG experience (companies)"
   - Allow the user to edit/correct before searching
   - Convert to GitHub search query and existing filter structure

2. **Search Alerts**: For any saved search, add an "Enable Alert" toggle:
   - When enabled, run the search automatically every 24 hours
   - Compare new results against previously seen candidates
   - If new matches are found, send a notification via:
     a. In-app notification badge (new icon in sidebar)
     b. Email digest (daily, configurable in settings)
     c. Slack webhook (if configured)
   - Show "X new candidates since last check" badge on the saved search

3. **Notification Center**: New sidebar item "Notifications" showing:
   - Alert results grouped by saved search
   - Each notification shows: search name, number of new candidates, top candidate preview
   - Mark as read, snooze, or disable alert from the notification

IMPLEMENTATION:
1. Create `supabase/functions/parse-nl-query/index.ts`:
   - Accepts natural language string
   - Uses Claude API to extract: `{ role, skills[], location, seniority, companies[], qualifications[] }`
   - Returns both the structured params AND a GitHub search query string
   - System prompt instructs Claude to only extract recruiting-relevant parameters

2. Create `supabase/functions/run-search-alert/index.ts`:
   - Accepts a saved search ID
   - Loads the search parameters from `saved_searches` table
   - Runs the search (reusing `github-search` logic)
   - Compares results against `search_alert_results` table to find new candidates
   - Sends notifications for new matches
   - Designed to be called by pg_cron

3. Create schema migration `supabase/migrations/20260303500000_search_alerts.sql`:
   ```sql
   ALTER TABLE saved_searches ADD COLUMN alert_enabled BOOLEAN DEFAULT false;
   ALTER TABLE saved_searches ADD COLUMN alert_frequency TEXT DEFAULT 'daily';
   ALTER TABLE saved_searches ADD COLUMN last_alert_run TIMESTAMPTZ;

   CREATE TABLE search_alert_results (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     saved_search_id UUID REFERENCES saved_searches(id) ON DELETE CASCADE,
     candidate_username TEXT NOT NULL,
     first_seen_at TIMESTAMPTZ DEFAULT now(),
     UNIQUE(saved_search_id, candidate_username)
   );

   CREATE TABLE notifications (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id),
     type TEXT NOT NULL, -- 'search_alert', 'pipeline_update', etc.
     title TEXT NOT NULL,
     body TEXT,
     metadata JSONB,
     read BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

4. Create `src/hooks/useNLQueryParser.ts`:
   - Manages the NL→structured conversion state
   - Shows parsed interpretation for user confirmation
   - Converts confirmed params to filters

5. Create `src/components/NotificationCenter.tsx`:
   - Sidebar notification bell with unread count badge
   - Dropdown panel showing recent notifications
   - Links to relevant saved searches

6. Create `src/components/search/NLQueryPreview.tsx`:
   - Shows the parsed interpretation as editable chips below the search bar
   - "Looks good, search!" and "Edit" buttons

7. Modify existing:
   - `src/components/SearchTab.tsx` — integrate NL parser, add alert toggle to saved searches
   - `src/components/DashboardLayout.tsx` — add notification bell to sidebar
   - `src/components/SettingsTab.tsx` — add alert notification preferences (email frequency, Slack toggle)

Run `npx vitest run` and `npx tsc --noEmit` after implementation.
```

---

## APPENDIX: Additional Issues Found

### Code Quality (Lower Priority)
- 79 ESLint `no-explicit-any` errors across the codebase
- Two toast notification systems mounted simultaneously (`Toaster` + `Sonner`)
- `next-themes` package in dependencies but theme is hand-rolled via localStorage
- `SearchResults.tsx` and `Pipeline.tsx` pages are orphaned (no routes point to them)
- `SearchProgress` component imported but never used in `SearchTab`
- Duplicated constants: `STAGES`, `getScoreColor()`, `SUPABASE_URL/KEY` across 5+ files
- `QueryClient` instantiated at module scope (survives HMR, causes stale cache)
- Auth race condition between `onAuthStateChange` and `getSession()`
- `use-toast.ts` useEffect dependency should be `[]` not `[state]`
- Multiple `setTimeout` calls without cleanup on unmount
- `DeveloperCard` nests interactive elements inside a `<button>` (invalid HTML)
- Bot username detection has false positives (`robotics-engineer`, `abbott`)
- No keyboard accessibility for drag-and-drop in pipeline or skill priorities
- Missing ARIA attributes on custom dropdowns throughout the app
- No `React.StrictMode` wrapper in `main.tsx`
