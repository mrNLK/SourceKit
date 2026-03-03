# SourceKit QA Fix Prompts

Repo: github.com/mrNLK/sourcekit-charm
Stack: React + Vite + TypeScript + shadcn/ui + Tailwind CSS + Supabase
Date: 2026-02-28
Total bugs: 10 (2 P1, 5 P2, 3 P3)

---

## P1 FIXES (do these first)

### BUG-001: Fix Outreach Generation TypeError

Console error: `Outreach generation failed: Error: Cannot read properties of undefined (reading 'name')`

Clicking "Generate Outreach" in the candidate detail panel throws "Cannot read properties of undefined (reading 'name')". The error fires 4-5 times per click (event handler leak).

Root cause: The outreach generation function reads company/role context (likely `strategy.company.name` or `role.name`) but this context is not passed when opening the candidate detail from the Results page or Pipeline.

Fix required:
1. Find the outreach generation handler (search for "Generate Outreach" button onClick or the function that reads `.name`).
2. Add null-safe access: use optional chaining (`?.`) or provide fallback values from the candidate's own data (e.g., current company from enrichment).
3. Fix the event handler leak: ensure the click handler is attached once. If using useEffect, add a cleanup return. If using onClick prop directly, ensure the component isn't re-mounting multiple times.
4. Add a try/catch with a toast notification on failure so users see feedback instead of silent failure.
5. Add a loading state to the button while generation is in progress.

Files to check:
- Component rendering the "Generate Outreach" button (likely in src/components/CandidateDetail or similar)
- The outreach generation service/function
- The search strategy context/store that should provide role + company

Test: After fix, click "Generate Outreach" on any candidate from Results and from Pipeline. Verify: (a) no console errors, (b) loading state shows, (c) outreach text appears or error toast shows, (d) only 1 handler fires per click.

---

### BUG-002: Fix First Search Race Condition

First "Search with this strategy" click returns 0 results. Retry from Results page succeeds.

After building a sourcing strategy, clicking "Search with this strategy" navigates to the Results page but returns "No engineers found" (0 results). Clicking the Search button again on the Results page succeeds with 20 results.

Root cause hypothesis: The strategy state (search query, target repos, criteria) is passed via React state/context during navigation. The Results component fires the search edge function call before the state is fully populated, sending an empty or incomplete request.

Fix required:
1. Find where "Search with this strategy" triggers navigation + search.
2. Ensure the search request only fires AFTER the strategy state is confirmed available. Options:
   a. Pass strategy as URL params or route state instead of context.
   b. Add a useEffect in Results that watches for strategy state and only triggers search when state is non-null.
   c. Trigger the search from the strategy page BEFORE navigating, store the request promise, and resolve it on the Results page.
3. Add a retry mechanism: if search returns 0 results and strategy state is available, auto-retry once after 500ms.

Files to check:
- Strategy page component (the "Search with this strategy" button handler)
- Results page component (the search trigger logic)
- The search state/context provider
- The github-search edge function call

Test: Build a strategy for any role > click "Search with this strategy" > verify results appear on first attempt without needing to retry. Repeat 5x to confirm no intermittent failures.

---

## P2 FIXES

### BUG-003 + BUG-004: Pipeline Stage Dropdown Fixes

Issues:
1. Stage dropdown on candidate detail (from Pipeline) only shows "Sourced" and "Contacted". Missing: Responded, Screen, Offer.
2. After selecting a new stage, the dropdown button text does not update (still shows old stage), even though the change persists in Supabase.

Fix:
1. Find the stage dropdown component. Ensure it reads ALL stage options from the same constant/enum used by the kanban columns: ["sourced", "contacted", "responded", "screen", "offer"].
2. After the Supabase upsert succeeds, update the local React state for the selected stage. Use setState or invalidate the query cache (if using React Query / TanStack Query).

Test: Open candidate from Pipeline > dropdown shows all 5 stages > select "Screen" > button text updates to "Screen" > go back to kanban > candidate appears in Screen column.

---

### BUG-005: Fix Route Persistence on Refresh

Pressing F5 on any page (Pipeline, Results, History, etc.) always redirects to the New Search home page.

Fix options:
1. If using react-router with BrowserRouter: ensure Vercel has a rewrite rule in vercel.json:
   `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
2. If using in-memory state for navigation (no URL changes): switch to proper route paths (/pipeline, /results, /history, etc.) so the URL reflects the current page.
3. If using HashRouter: this should already work. Check if the router is wrapping the entire app correctly.

Test: Navigate to Pipeline > press F5 > should stay on Pipeline. Repeat for Results, History, Watchlist, Settings.

---

### BUG-006 + BUG-007: Outreach Error Handling + Handler Leak

Issues:
1. No loading spinner, success message, or error toast when outreach generation runs or fails.
2. Click handler fires 4-5 times per single click.

Fix:
1. Add loading state: set isGenerating=true on click, show spinner on button, disable button during generation.
2. On success: display generated outreach text in a text area below the button with a "Copy" button.
3. On error: show a toast/alert with a user-friendly message like "Failed to generate outreach. Please try again."
4. Fix handler leak: if using addEventListener in useEffect, return a cleanup function. Prefer onClick prop on the button element.

Test: Click "Generate Outreach" > button shows spinner > on completion, text appears or error toast shows. Check console: only 1 handler fires per click.

---

## P3 IMPROVEMENTS

### BUG-008: History Result Count Accuracy

History shows "46 results" for a search that displays 20 candidates on the Results page.

Fix: When writing to search_history table, store the count of candidates that were actually processed and displayed, not the raw GitHub API match count. Alternatively, show both: "46 found, 20 displayed" to set accurate expectations.

---

### BUG-009: Truncated Search Criteria Tags

Tags like "Large language model dev..." are cut off with ellipsis but have no tooltip showing the full text.

Fix: Add a title attribute or a Tooltip component (shadcn/ui has one) to each criteria tag showing the full text on hover.

---

### BUG-010: Kanban Drag-and-Drop Verification

Automated testing could not confirm drag-and-drop works on the kanban board. Drop zones display "Drop candidates here" text.

Action: Manually test drag-and-drop in Chrome. If it works, no fix needed. If not, ensure the DnD library (likely @dnd-kit or react-beautiful-dnd) is properly configured with droppable zones and draggable items. The onDragEnd handler should call the same Supabase update as the stage dropdown.
