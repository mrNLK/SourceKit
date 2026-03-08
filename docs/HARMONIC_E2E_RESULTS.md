# Harmonic Integration E2E Test Results

**Date:** 2026-03-08
**Environment:** Production (iirwwadiedcbcrxpehog.supabase.co / getsourcekit.vercel.app)

## Summary

Both Harmonic edge functions (`harmonic-person`, `harmonic-intelligence`) are deployed, functional, and verified end-to-end against production Supabase. The Intelligence tab UI now includes "Harmonic" as a provider option with dispatch logic to call the edge function.

## Edge Functions

### harmonic-person

- **Status:** Deployed, working
- **Endpoint:** `POST /functions/v1/harmonic-person`
- **Payload:** `{ personId, linkedinUrl?, personContext? }`
- **Verified with:** Andrej Karpathy (LinkedIn: `/in/andrej-karpathy-9a650716`)
- **Results:**
  - Person record updated with `harmonic_person_id`, `harmonic_enriched_at`, `metadata.harmonic_profile`
  - External profile upserted with `platform: "harmonic"`, `profile_type: "linkedin"`
  - Company cache populated for current employer
  - 6 experience entries, 3 education entries returned

### harmonic-intelligence

- **Status:** Deployed, working
- **Endpoint:** `POST /functions/v1/harmonic-intelligence`
- **Payload:** `{ runId, query, conceptId?, limit? }`
- **Verified with:** "AI robotics startups San Francisco" (limit: 5)
- **Results:**
  - 5 companies returned: Anthropic, OpenAI, Eloquent AI, Resolve AI, Together AI
  - Run status updated to "completed" with results_count
  - Companies cached in `aifund_harmonic_companies` with full enrichment data
  - Funding stages, headcount, domains, locations all populated

## Database Schema

Migration `20260308000000_align_harmonic_schema.sql` applied via Management API SQL. Changes:

- `aifund_people`: Added `harmonic_person_id`, `harmonic_enriched_at`, `metadata`, `bio`, `current_role`, `user_id`
- `aifund_intelligence_runs`: Added `results_count`, `completed_at`, `results_summary`, `query_params`; relaxed `provider` check to include "harmonic"; relaxed `status` check to include "pending", "completed", "failed"; made `action` nullable
- `aifund_external_profiles`: Added `platform`, `profile_url`, `profile_data`, `fetched_at`; relaxed `provider` and `profile_type` checks
- `aifund_harmonic_companies`: New table with RLS
- `aifund_harmonic_saved_searches`: New table with RLS
- Service role policies added for edge function access

## Frontend Changes

### Files Modified

- `src/types/ai-fund.ts`: Added `"harmonic"` to `IntelligenceProvider` union type
- `src/lib/ai-fund.ts`: Added `dispatchHarmonicIntelligence()` function that calls the edge function
- `src/components/ai-fund/IntelligenceTab.tsx`: Added "Harmonic" to provider dropdown, labels, and dispatch logic in `handleCreate`

### Dispatch Flow

1. User selects "Harmonic" provider, enters query, clicks "Start Run"
2. `createIntelligenceRun` inserts DB row with `provider: "harmonic"`, `status: "pending"`
3. `dispatchHarmonicIntelligence` calls edge function with `{ runId, query }`
4. Edge function searches Harmonic, caches companies, updates run to "completed"
5. UI updates run row with new status and results count

## Feature Gaps (Not Bugs)

- **Founder import:** No UI to browse companies/founders from Intelligence results or import them into Talent Pool. Data exists in `aifund_harmonic_companies.founders` (JSONB) but isn't surfaced.
- **Intelligence detail view:** No drill-down view for completed runs. The tab only shows run status/count.
- **Concept-linked searches:** Edge function supports `conceptId` parameter and writes to `aifund_harmonic_saved_searches`, but the UI doesn't expose concept linking in the New Run form.
- **Talent Pool click-to-detail:** TalentPoolTab rows don't navigate to a detail page. Only the external LinkedIn icon is clickable.

## Deployment Notes

- Both functions deployed with `--no-verify-jwt` flag (required for programmatic token auth)
- Debug `console.log` statements removed from `_shared/harmonic.ts`
- Harmonic API v2 uses `urn` field (not `company_urn`/`entity_urn`) and `include_columns` parameter
