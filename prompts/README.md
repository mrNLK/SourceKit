# SourceKit — Claude Code Prompts

21 self-contained prompts for improving SourceKit, organized by category. Each prompt is designed to be pasted directly into Claude Code with the repo open.

## Recommended Execution Order

Start with foundational stability, then highest-impact features:

| Phase | Prompts | Rationale |
|-------|---------|-----------|
| **1. Stability** | 06, 01, 02, 05, 19, 21 | Input validation, debounce, empty states, error handling |
| **2. High-impact features** | 09, 10, 14 | CSV export, filtering/sorting, outreach tracking |
| **3. Remaining bugs** | 03, 04 | Pipeline stage names, persistence |
| **4. Performance** | 07, 08 | Caching, virtualized rendering |
| **5. Features** | 11, 12, 13, 15, 16, 17, 18 | Compare, history, shortcuts, EEA, Slack, theme, notes |
| **6. Polish** | 20 | Skeleton loaders |

## Directory Structure

```
prompts/
├── README.md                          ← You are here
├── bug-fixes/
│   ├── 01-debounce-run-search.md
│   ├── 02-empty-state-handling.md
│   ├── 03-pipeline-stage-names.md
│   ├── 04-persist-pipeline-watchlist.md
│   ├── 05-jd-url-parsing-fallback.md
│   └── 06-input-validation.md
├── performance/
│   ├── 07-search-result-caching.md
│   └── 08-virtualized-rendering.md
├── features/
│   ├── 09-csv-export.md
│   ├── 10-filtering-sorting.md
│   ├── 11-compare-view.md
│   ├── 12-search-history.md
│   ├── 13-keyboard-shortcuts.md
│   ├── 14-outreach-tracking.md
│   ├── 15-batch-eea.md
│   ├── 16-slack-webhooks.md
│   ├── 17-dark-light-toggle.md
│   └── 18-candidate-notes-tags.md
└── code-quality/
    ├── 19-error-boundaries.md
    ├── 20-skeleton-loaders.md
    └── 21-console-error-audit.md
```

## Prompt Index

### Bug Fixes (01–06)

| # | File | Summary |
|---|------|---------|
| 01 | `bug-fixes/01-debounce-run-search.md` | Prevent duplicate API calls from rapid double-clicks |
| 02 | `bug-fixes/02-empty-state-handling.md` | Add proper empty states to all tabs |
| 03 | `bug-fixes/03-pipeline-stage-names.md` | Reconcile pipeline stages with documentation |
| 04 | `bug-fixes/04-persist-pipeline-watchlist.md` | Ensure pipeline/watchlist survive refresh and logout |
| 05 | `bug-fixes/05-jd-url-parsing-fallback.md` | Graceful fallback when JD URL extraction fails |
| 06 | `bug-fixes/06-input-validation.md` | Custom inline validation for all search form inputs |

### Performance (07–08)

| # | File | Summary |
|---|------|---------|
| 07 | `performance/07-search-result-caching.md` | Client-side cache keyed by query hash |
| 08 | `performance/08-virtualized-rendering.md` | Virtualized list for 50+ candidate cards |

### Features (09–18)

| # | File | Summary |
|---|------|---------|
| 09 | `features/09-csv-export.md` | Export results as CSV with all candidate fields |
| 10 | `features/10-filtering-sorting.md` | Score range slider, hidden gems toggle, sort options |
| 11 | `features/11-compare-view.md` | Side-by-side comparison of 2–3 candidates |
| 12 | `features/12-search-history.md` | Searchable history with re-run and cached results |
| 13 | `features/13-keyboard-shortcuts.md` | Command palette, tab switching, card navigation |
| 14 | `features/14-outreach-tracking.md` | Copy outreach + auto-move candidate to Contacted |
| 15 | `features/15-batch-eea.md` | Batch EEA enrichment with progress bar |
| 16 | `features/16-slack-webhooks.md` | Slack notifications on pipeline stage changes |
| 17 | `features/17-dark-light-toggle.md` | Light/dark theme with CSS custom properties |
| 18 | `features/18-candidate-notes-tags.md` | Free-text notes and predefined tags per candidate |

### Code Quality (19–21)

| # | File | Summary |
|---|------|---------|
| 19 | `code-quality/19-error-boundaries.md` | Error boundary, global rejection handler, API timeouts |
| 20 | `code-quality/20-skeleton-loaders.md` | Replace spinners with shimmer skeletons |
| 21 | `code-quality/21-console-error-audit.md` | Zero console errors across all flows |

## Usage

Open a prompt file and paste its contents into Claude Code:

```bash
cat prompts/bug-fixes/06-input-validation.md
```

Or reference the file directly in a Claude Code session for context.
