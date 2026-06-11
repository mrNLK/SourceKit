# SourceKit Recruiter OS — Build Notes

## What Was Built

A fully separate recruiter product experience at `/recruiter` within the existing SourceKit SPA. This is not a reskin — it's a distinct product boundary with its own layout, navigation, data model, routing, and screen copy, built on SourceKit infrastructure.

**Product Name:** SourceKit Recruiter OS
**Route Prefix:** `/recruiter`
**Target Users:** Heads of Talent, technical recruiters, sourcers, founder-operators hiring AI-native technical talent

## How to Access

Navigate to `/recruiter` when authenticated. The original SourceKit app at `/` remains fully intact.

## Architecture

- **Route Group:** `/recruiter/*` route group inside existing SPA via React Router v6
- **Lazy Loading:** All recruiter pages are lazy-loaded for code splitting
- **Isolation:** Separate layout component (`RecruiterLayout`), dedicated CSS scope (`.recruiter-os` class), own page components, hooks, services, and types
- **Shared Infra:** Supabase client, auth, React Query provider, shadcn/ui primitives, and existing API utilities are reused

## Sections Built

| Section | Route | Description |
|---------|-------|-------------|
| Command Center | `/recruiter` | Operational dashboard: stats, review queue, agent runs, scorecards, pipeline snapshot |
| Search Lab | `/recruiter/search` | Role-brief-driven search workspace with archetypes, signals, source toggles, search modes |
| Candidate Intel | `/recruiter/candidates` | Dense sortable/filterable candidate table |
| Candidate Profile | `/recruiter/candidates/:id` | Full profile with 6-dimension scoring, evidence tabs, outreach history, notes |
| Team Pipeline | `/recruiter/pipeline` | Board + table views with tier columns, stage grouping, bulk actions |
| Outreach Studio | `/recruiter/outreach` | Three-column outreach workspace: queue, editor with evidence grounding, candidate evidence |
| Role Scorecards | `/recruiter/scorecards` | CRUD for reusable role definitions with signals, weights, suppressions, eval questions |
| Scorecard Detail | `/recruiter/scorecards/:id` | Full scorecard editor with launch-search integration |
| Agent Runs | `/recruiter/agents` | Run log with expandable detail, error display, filtering, auto-refresh |
| Reports | `/recruiter/reports` | 8 report types with data adapters and graceful degradation |
| Settings | `/recruiter/settings` | ATS integration, API keys, notifications, scoring defaults, team, appearance |

## Transparent Scoring Model

Six scoring dimensions, each with evidence citations:
- **EEA Score** — Evidence of Exceptional Ability (USCIS criteria)
- **Builder Score** — Shipping velocity, ownership, project completion
- **AI Recency Score** — Recent frontier AI work
- **Systems Depth Score** — Infrastructure and architecture signals
- **Product Instinct Score** — User-facing craft and product thinking
- **Hidden Gem Score** — High proof-to-visibility ratio

Scores are structured as `{ score: number, evidence: [], confidence: 'high'|'medium'|'low', reason: string }` and designed to be replaceable by backend-calculated values.

## Files Created

### Core Structure
```
src/recruiter/
├── RecruiterLayout.tsx          # App shell with left nav
├── RecruiterNav.tsx             # Persistent sidebar navigation
├── routes.tsx                   # Route definitions with lazy loading
├── pages/
│   ├── CommandCenter.tsx        # /recruiter
│   ├── SearchLab.tsx            # /recruiter/search
│   ├── CandidateIntelList.tsx   # /recruiter/candidates
│   ├── CandidateIntelProfile.tsx# /recruiter/candidates/:id
│   ├── TeamPipeline.tsx         # /recruiter/pipeline
│   ├── OutreachStudio.tsx       # /recruiter/outreach
│   ├── RoleScorecardList.tsx    # /recruiter/scorecards
│   ├── RoleScorecardDetail.tsx  # /recruiter/scorecards/:id
│   ├── AgentRuns.tsx            # /recruiter/agents
│   ├── Reports.tsx              # /recruiter/reports
│   └── RecruiterSettings.tsx    # /recruiter/settings
├── components/
│   ├── TierBadge.tsx            # Tier classification badge
│   ├── ScoreCard.tsx            # Score display with evidence expand
│   ├── StatusBadge.tsx          # Stage, contact, run status, ATS, priority badges
│   ├── PageHeader.tsx           # Page header with title and actions
│   ├── StatCard.tsx             # Stat card for command center
│   └── EmptyState.tsx           # Empty state pattern
├── hooks/
│   ├── useRecruiterCandidates.ts# Candidate CRUD + pipeline stats
│   ├── useRecruiterScorecard.ts # Scorecard CRUD
│   ├── useAgentRuns.ts          # Agent run queries + polling
│   ├── useRecruiterOutreach.ts  # Outreach CRUD
│   ├── useRecruiterNotes.ts     # Candidate notes
│   └── useRecruiterSavedSearches.ts # Saved search management
├── services/
│   ├── scoring.ts               # Client-side scoring utilities
│   └── export.ts                # CSV export
├── lib/
│   ├── types.ts                 # All TypeScript interfaces
│   └── constants.ts             # Tier/stage/score/report configs
└── styles/
    └── recruiter-tokens.css     # CSS custom properties + animations
```

### Database Migration
```
supabase/migrations/20260323_recruiter_os_schema.sql
```

7 new tables:
- `recruiter_scorecards` — Role scorecard definitions
- `recruiter_candidates` — Extended candidate model with multi-surface data
- `recruiter_candidate_notes` — Recruiter notes per candidate
- `recruiter_outreach` — Outreach messages with grounding artifacts
- `recruiter_agent_runs` — Agent job tracking
- `recruiter_saved_searches` — Saved search configurations
- `recruiter_sequence_templates` — Outreach sequence templates

All tables have:
- UUID primary keys
- User-scoped RLS policies
- Appropriate indexes
- Updated_at triggers

## Files Modified

| File | Change |
|------|--------|
| `src/App.tsx` | Added `/recruiter/*` route group with lazy-loaded RecruiterLayout |
| `tailwind.config.ts` | Added `ros-fade-in` keyframe and animation |
| `vite.config.ts` | Added recruiter chunk naming for code splitting |

## Design System

- **Dark mode default** (forced via `.recruiter-os` CSS scope)
- **Fonts:** DM Sans (body) + JetBrains Mono (labels, scores, data)
- **Accent:** `#00e5a0` (same as SourceKit primary)
- **Background:** `#0a0a0f` (deeper than default dark mode)
- **Information density:** Compact tables, small text, sticky headers
- **CSS variables:** All recruiter tokens scoped under `.recruiter-os` class

## Backend Assumptions / TODOs

1. **Database migration** needs to be applied to Supabase: `supabase db push` or run the SQL manually
2. **Search execution** — Search Lab UI is wired but `recruiter-search-orchestrator` edge function needs to be built to orchestrate multi-source search
3. **Scoring backend** — `recruiter-scoring` edge function needs to be built for server-side multi-dimensional scoring with Claude
4. **Outreach generation** — `recruiter-outreach-gen` edge function needs to be built for artifact-grounded message generation
5. **Enrichment** — `recruiter-enrichment` edge function for multi-surface candidate enrichment (LinkedIn, HuggingFace, web)
6. **ATS sync** — Webhook-based export is stubbed in Settings, needs `recruiter-ats-sync` edge function
7. **Dedup** — Cross-search deduplication needs `recruiter-dedup` edge function
8. **Reports** — Some report types show placeholder structures pending sufficient data
9. **Drag-and-drop** — Pipeline board uses explicit actions (not DnD) for reliability
10. **Team features** — Data model supports `user_id` scoping; multi-user/team features deferred

## Running the App

```bash
npm install
npm run dev
# Navigate to http://localhost:8080/recruiter
```

The original SourceKit app continues to work at `http://localhost:8080/`.
