# SourceKit Claude Code Prompts

Copy-paste each prompt directly into Claude Code. Each is self-contained with file paths, context, and acceptance criteria.

---

## P1 BUGS

### BUG-001: History items re-fire search instead of loading cached results

```
Fix the history replay flow so clicking a history item loads cached candidates from Supabase instead of re-firing the github-search edge function.

Current broken flow:
1. HistoryTab.tsx line 143: onClick calls onRerun(item.query, meta.expanded_query)
2. Index.tsx handleRerun (line 48-57): sets rerunQuery/rerunExpanded/rerunKey, switches to search tab
3. SearchTab.tsx useEffect (line 140-147): detects autoSubmit + initialQuery, sets activeQuery
4. useQuery triggers searchDevelopers() which calls the github-search edge function
5. Edge function re-runs the full GitHub API search, which may return different/zero results
6. User sees "No engineers found" despite history showing 15 or 60 results

Required fix:

1. In the github-search edge function (supabase/functions/github-search/index.ts), generate a search_id (uuid) at the start of each search run. After inserting/upserting candidates, also insert a row into a new search_results junction table linking search_id to each candidate id. Return search_id in the response payload.

2. Create a new migration file (supabase/migrations/20260301000000_search_results_table.sql):
   - CREATE TABLE search_results (id uuid primary key default gen_random_uuid(), search_id uuid not null, candidate_id uuid references candidates(id), created_at timestamptz default now())
   - CREATE INDEX idx_search_results_search_id ON search_results(search_id)
   - Enable RLS, add read policy for authenticated users

3. In SearchTab.tsx, update the history save useEffect (line 207-234) to also store the search_id returned from the edge function response in the search_history metadata: metadata.search_id = response.search_id

4. In HistoryTab.tsx, update the click handler to pass search_id: onClick={() => onRerun(item.query, meta.expanded_query, item.metadata?.search_id)

5. In Index.tsx, add rerunSearchId state. Update handleRerun to accept and pass search_id.

6. In SearchTab.tsx, add a new code path: if initialSearchId is provided (from history replay), skip the edge function call entirely. Instead, query Supabase directly:
   - SELECT c.* FROM candidates c JOIN search_results sr ON sr.candidate_id = c.id WHERE sr.search_id = initialSearchId
   - Use this result set instead of calling searchDevelopers()

7. The useQuery queryKey should include search_id when present so it caches separately.

Acceptance criteria:
- Clicking a history item loads the exact same candidates that were returned in the original search
- No network call to github-search edge function when replaying from history
- New searches still work normally (search_id is generated and stored)
- History items that predate this change (no search_id in metadata) fall back to the current re-search behavior
```

---

## P2 BUGS / IMPROVEMENTS

### BUG-002: Search history lacks error recovery UI

```
In src/components/HistoryTab.tsx, history items with metadata.status === 'error' show a red "Failed" badge but offer no action beyond re-running the same search. Add a small "Retry" button next to failed items that re-triggers the search with the same parameters. Also add a tooltip or expandable row showing the error message from metadata.error so users can understand what went wrong (e.g., rate limit, auth failure).

Files to modify:
- src/components/HistoryTab.tsx

Acceptance criteria:
- Failed history items show the error reason on hover or click-to-expand
- A "Retry" button appears next to failed items
- Retry calls onRerun with the original query and expanded_query
```

### BUG-003: Candidate deduplication is case-sensitive across searches

```
In src/components/SearchTab.tsx around line 199, candidate deduplication uses a case-insensitive Set on github_username. However, the candidates table in Supabase has a UNIQUE constraint on github_username (case-sensitive). If the same user appears as "JohnDoe" from one API call and "johndoe" from another, both rows get inserted.

Fix:
1. In supabase/functions/github-search/index.ts, normalize github_username to lowercase before upserting into the candidates table
2. Create a migration that updates existing rows: UPDATE candidates SET github_username = LOWER(github_username) WHERE github_username != LOWER(github_username)
3. Handle any duplicate conflicts from the normalization (keep the most recently updated row)

Files to modify:
- supabase/functions/github-search/index.ts
- New migration file

Acceptance criteria:
- All github_username values are lowercase in the database
- Edge function normalizes usernames to lowercase before upsert
- No duplicate constraint violations after migration
```

---

## P3 IMPROVEMENTS

### IMP-001: Add search_history deletion and management

```
In src/components/HistoryTab.tsx, users cannot delete individual history entries or clear all history. Add:

1. A delete button (trash icon) on each history item row. On click, DELETE FROM search_history WHERE id = item.id. Confirm with a toast, not a modal.

2. A "Clear All" button in the header area of the history tab. On click, DELETE FROM search_history WHERE user_id = current_user. Show a confirmation toast.

3. After deletion, invalidate the React Query cache for search_history so the list re-fetches.

Files to modify:
- src/components/HistoryTab.tsx

Acceptance criteria:
- Individual history items can be deleted with one click
- "Clear All" removes all history for the current user
- List updates immediately after deletion
- No confirmation modal (use toast with undo if possible, otherwise just delete)
```

### IMP-002: Export pipeline candidates to CSV

```
The Pipeline page (src/pages/Pipeline.tsx) has candidate cards in a kanban board but no export functionality. The Bulk Actions tab (src/components/BulkActionsTab.tsx) has an Export All button but it only covers candidates visible in that tab's table view.

Add a CSV export button to the Pipeline page header that exports all pipeline candidates across all stages with columns: name, github_username, github_url, linkedin_url, email, score, stage, location, top_languages, added_at.

Use the browser's native Blob/URL.createObjectURL pattern. No external CSV library needed.

Files to modify:
- src/pages/Pipeline.tsx

Acceptance criteria:
- Export button in pipeline page header
- CSV includes all candidates across all stages
- Columns: name, github_username, github_url, linkedin_url, email, score, stage, location, top_languages, added_at
- File downloads as "sourcekit-pipeline-YYYY-MM-DD.csv"
```

### IMP-003: Add loading skeleton states

```
Several tabs show a blank white space or spinner while data loads. Replace these with skeleton loading states for better perceived performance.

Add skeleton components (gray pulsing rectangles matching the shape of the final content) to:
1. SearchTab.tsx - skeleton cards matching DeveloperCard layout while search results load
2. HistoryTab.tsx - skeleton rows matching history item layout while history loads
3. PipelineTab.tsx / Pipeline.tsx - skeleton kanban columns while pipeline data loads
4. WebsetsTab.tsx - skeleton list items while websets load

Use Tailwind's animate-pulse class on div elements sized to match the content they replace. Do not add a new dependency.

Files to modify:
- src/components/SearchTab.tsx
- src/components/HistoryTab.tsx
- src/components/PipelineTab.tsx or src/pages/Pipeline.tsx
- src/components/WebsetsTab.tsx

Acceptance criteria:
- Each tab shows content-shaped skeleton placeholders during loading
- Skeletons use animate-pulse with bg-muted or bg-gray-200 colors
- Skeletons disappear when data arrives
- No layout shift between skeleton and real content
```

### IMP-004: Rate limit feedback in search UI

```
The github-search edge function (supabase/functions/github-search/index.ts) handles GitHub API rate limits with retries and throws RATE_LIMITED errors. The frontend (src/lib/api.ts line 20-25) catches 429 responses and shows a generic toast.

Improve this:
1. In the edge function, when rate limited, include retry_after_seconds in the error response body (from the x-ratelimit-reset header minus current time)
2. In SearchTab.tsx, when a rate limit error is received, show an inline banner (not just a toast) with a countdown timer showing when the search can be retried. Auto-retry when the countdown hits zero.
3. Add a visual indicator on the search button showing remaining API quota if available (the edge function can return x-ratelimit-remaining in its successful response headers).

Files to modify:
- supabase/functions/github-search/index.ts
- src/lib/api.ts
- src/components/SearchTab.tsx

Acceptance criteria:
- Rate limit errors show a countdown timer in the search UI
- Auto-retry fires when countdown expires
- Users understand why their search failed and when it will work again
```

### IMP-005: Settings validation and save feedback

```
The Settings tab (src/components/SettingsTab.tsx) saves settings to Supabase on change but provides minimal feedback. Improve:

1. Add input validation: API keys should not be empty strings when saved. Webhook URLs should be valid URLs (basic regex or URL constructor check).
2. Show a green checkmark or "Saved" badge next to each field after successful save, auto-dismissing after 2 seconds.
3. Show a red error state if save fails (network error, auth error).
4. Add a "Test Webhook" button next to each webhook URL field that sends a test POST with a sample payload and shows success/failure inline.

Files to modify:
- src/components/SettingsTab.tsx

Acceptance criteria:
- Invalid inputs show inline validation errors
- Successful saves show brief confirmation
- Failed saves show error state
- Webhook test button sends a POST and reports result
```

---

## NEW FEATURES

### FEAT-001: Candidate comparison view

```
Add a side-by-side candidate comparison feature to the Bulk Actions tab (src/components/BulkActionsTab.tsx). The "Compare Selected" button already exists but has no implementation.

When 2-4 candidates are selected via checkboxes and "Compare Selected" is clicked:
1. Open a modal or slide-out panel showing candidates in columns
2. Rows: Name/Avatar, Score, Location, Top Languages, Stars, Public Repos, Followers, Bio, Highlights, LinkedIn URL
3. Highlight the best value in each row with a subtle green background
4. Add a "Winner" badge to the candidate with the highest composite score across all dimensions

Use the existing Radix Dialog component from src/components/ui/dialog.tsx.

Files to modify:
- src/components/BulkActionsTab.tsx
- Create src/components/CandidateCompare.tsx

Acceptance criteria:
- Compare button is disabled when fewer than 2 or more than 4 candidates are selected
- Comparison view shows all candidates side by side
- Best values highlighted per row
- Modal is dismissible
- Works on mobile (horizontal scroll)
```

### FEAT-002: Search filters persistence

```
SearchTab.tsx has filter controls (location, seniority, skills via SkillPriorities component, hidden gems toggle, result limit) but these reset on every new search or tab switch because they're held in local component state.

Persist search filters to the settings table in Supabase so they survive tab switches and page reloads:

1. On mount, load saved filters from settings table (key: 'search_filters', value: JSON string)
2. On filter change, debounce-save (500ms) the current filter state to the settings table
3. Filters to persist: location, seniority, skills priority list, hideUngettable toggle, result limit
4. Add a "Reset Filters" button that clears all filters back to defaults and deletes the settings row

Files to modify:
- src/components/SearchTab.tsx
- src/components/search/SearchFilters.tsx (if filter state lives here)

Acceptance criteria:
- Filters persist across tab switches within the same session
- Filters persist across page reloads
- "Reset Filters" clears to defaults
- Filter save is debounced (no excessive writes)
```

### FEAT-003: Bulk outreach message generation

```
The Pipeline page (src/pages/Pipeline.tsx) generates outreach messages one candidate at a time using Anthropic Claude API. Add bulk outreach generation:

1. Add a "Generate All Outreach" button at the top of the Pipeline page
2. On click, identify all candidates in the "sourced" stage that do not yet have an entry in the outreach_history table
3. For each candidate (batch of 5 at a time, not all at once), call the existing outreach generation logic
4. Show a progress indicator: "Generating outreach: 3/12 complete"
5. As each message is generated, save it to outreach_history and update the candidate's card to show the message is ready
6. Add a "Copy All Messages" button that copies all generated messages to clipboard in a formatted list (Name: message)

Files to modify:
- src/pages/Pipeline.tsx

Acceptance criteria:
- Bulk generation processes candidates in batches of 5
- Progress indicator shows completion count
- Messages are saved to outreach_history table
- Individual candidate cards update as their messages complete
- "Copy All" copies formatted output to clipboard
- Errors on individual candidates don't block the rest of the batch
```

### FEAT-004: Candidate notes and tags

```
Add a notes and tagging system to candidate profiles. Currently the CandidateSlideOut component (src/components/CandidateSlideOut.tsx) shows candidate details but has no way to add recruiter notes or custom tags.

1. Create a new migration for a candidate_notes table:
   - id uuid primary key
   - candidate_id uuid references candidates(id)
   - user_id uuid references auth.users(id)
   - content text not null
   - created_at timestamptz default now()
   - updated_at timestamptz default now()
   RLS: users can only read/write their own notes

2. Create a new migration for a candidate_tags table:
   - id uuid primary key
   - candidate_id uuid references candidates(id)
   - user_id uuid references auth.users(id)
   - tag text not null
   - color text default 'blue'
   - created_at timestamptz default now()
   UNIQUE(candidate_id, user_id, tag)
   RLS: users can only read/write their own tags

3. In CandidateSlideOut.tsx, add:
   - A "Notes" section with a textarea and "Save" button
   - Display existing notes in reverse chronological order
   - A "Tags" section with an input field and colored pill display
   - Click a tag pill to remove it
   - Preset tag suggestions: "Strong Hire", "Follow Up", "Not Now", "Culture Fit", "Technical Gap"

4. Show tags on DeveloperCard.tsx as small colored pills below the candidate name

Files to modify:
- New migration files (2)
- src/components/CandidateSlideOut.tsx
- src/components/DeveloperCard.tsx

Acceptance criteria:
- Notes can be added, viewed, and are persisted in Supabase
- Tags can be added and removed per candidate
- Tags show on candidate cards in search results and pipeline
- Preset tag suggestions appear as clickable chips
- Each user only sees their own notes and tags
```

### FEAT-005: Webhook notifications for pipeline stage changes

```
The Settings tab has webhook_url and slack_webhook_url fields but they're not connected to any events. Implement webhook firing when candidates move between pipeline stages.

1. In src/pages/Pipeline.tsx, find the stage update mutation (where the pipeline table is updated with a new stage value). After successful stage update, fire webhooks.

2. Create a utility function in src/lib/webhooks.ts:
   - async function fireWebhooks(event: string, payload: object)
   - Load webhook_url and slack_webhook_url from settings table
   - If webhook_url exists, POST JSON payload to it
   - If slack_webhook_url exists, POST Slack-formatted message (with blocks: candidate name, old stage, new stage, link to profile)
   - Fire-and-forget (don't block the UI on webhook response)
   - Log errors to console but don't surface to user

3. Payload format:
   {
     event: "pipeline.stage_changed",
     candidate: { name, github_username, github_url, score },
     from_stage: "sourced",
     to_stage: "contacted",
     timestamp: ISO string
   }

4. Slack message format:
   {
     text: "Pipeline Update: {name} moved from {from_stage} to {to_stage}",
     blocks: [section block with candidate details and link]
   }

Files to create:
- src/lib/webhooks.ts

Files to modify:
- src/pages/Pipeline.tsx

Acceptance criteria:
- Moving a candidate between stages fires configured webhooks
- Both generic webhook and Slack webhook formats work
- Webhooks are fire-and-forget (UI is not blocked)
- Missing/empty webhook URLs are silently skipped
- Webhook errors are logged but don't break the pipeline UI
```

### FEAT-006: Search saved queries (bookmarks)

```
Add the ability to save/bookmark frequently used search queries for quick re-use.

1. Create a migration for saved_queries table:
   - id uuid primary key
   - user_id uuid references auth.users(id)
   - name text not null (user-defined label)
   - query text not null
   - expanded_query text
   - filters jsonb (location, seniority, skills, etc.)
   - created_at timestamptz default now()
   RLS: users can only access their own saved queries

2. In SearchTab.tsx, add a bookmark icon button next to the search bar. On click:
   - If query is not empty, show a small popover asking for a name (default: first 30 chars of query)
   - Save to saved_queries table
   - Show toast confirmation

3. In SearchTab.tsx, add a "Saved Searches" dropdown/section below the search bar:
   - List saved queries as clickable chips
   - Click to populate search bar and auto-submit
   - Long-press or right-click to delete

4. In HistoryTab.tsx, add a bookmark icon on each history item to quick-save it

Files to create:
- New migration file

Files to modify:
- src/components/SearchTab.tsx
- src/components/HistoryTab.tsx

Acceptance criteria:
- Users can save a search query with a custom name
- Saved searches appear as clickable chips in the search tab
- Clicking a saved search populates and auto-submits
- Saved searches can be deleted
- History items can be bookmarked directly
```

### FEAT-007: Dark mode toggle

```
The app currently uses a light theme (Tailwind default). Add a dark mode toggle that persists across sessions.

1. In src/components/SettingsTab.tsx, add a "Theme" section with a toggle switch: Light / Dark
2. Save preference to settings table (key: 'theme', value: 'light' | 'dark')
3. On app mount (src/App.tsx), load theme preference and apply 'dark' class to document.documentElement
4. Use Tailwind's dark: variant throughout the app. The existing shadcn/ui components already support dark mode via the dark class on html element.
5. Add a small theme toggle icon in the DashboardLayout.tsx header (sun/moon icon from lucide-react) for quick access without going to settings.

Files to modify:
- src/App.tsx (load theme on mount)
- src/components/DashboardLayout.tsx (toggle icon in header)
- src/components/SettingsTab.tsx (theme section)
- tailwind.config.ts (ensure darkMode: 'class' is set)

Acceptance criteria:
- Dark mode toggle works and persists across sessions
- All UI elements are readable in dark mode (shadcn components handle this)
- Quick toggle accessible from header
- Default theme is light for new users
```

### FEAT-008: Real-time search progress streaming

```
The github-search edge function processes multiple steps (parse query, fetch contributors, search users, fetch profiles, AI scoring) but the frontend only shows a spinner until all steps complete. Add real-time progress updates.

1. Modify the edge function (supabase/functions/github-search/index.ts) to use Supabase Realtime or a polling pattern:
   - At the start of each major step, insert/update a row in a new search_progress table: { search_id, user_id, step: 'parsing_query' | 'fetching_contributors' | 'searching_users' | 'fetching_profiles' | 'scoring' | 'complete', progress_pct: 0-100, message: 'Analyzing 6 repositories...' }

2. Create migration for search_progress table:
   - id uuid primary key
   - search_id uuid not null
   - user_id uuid
   - step text not null
   - progress_pct integer default 0
   - message text
   - updated_at timestamptz default now()
   RLS: users can read their own rows
   Add index on (user_id, search_id)

3. In SearchTab.tsx, when a search is active:
   - Subscribe to Supabase Realtime on search_progress table filtered by user_id
   - Display a multi-step progress indicator showing: current step name, progress percentage, descriptive message
   - Use the existing SearchProgress component pattern or create a new one

4. Clean up: delete search_progress rows after search completes (or after 1 hour via a cron/trigger)

Files to create:
- New migration file

Files to modify:
- supabase/functions/github-search/index.ts
- src/components/SearchTab.tsx
- src/components/SearchProgress.tsx (if it exists, extend it)

Acceptance criteria:
- Users see which step the search is on in real time
- Progress percentage updates as contributors/profiles are fetched
- Descriptive messages like "Fetching contributors from 6 repositories..." appear
- Progress indicator disappears when search completes
- Works for concurrent searches by different users (user_id isolation)
```
