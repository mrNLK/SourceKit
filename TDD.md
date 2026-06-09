# SellKit BD Sourcing App TDD

## Goal

Implement the BD sourcing workflow inside SourceKit with deterministic rules, Supabase schema, provider adapters, a review queue UI, draft-first approval, and tests that prove v1 stays manual-first with no external email send or CRM write.

## Technical Decisions

- Use the existing Vite React app and expose `SellKit` as a standalone `/sellkit` app route, with `/bd-sourcing` kept as a compatibility path.
- Keep all provider calls behind adapter interfaces.
- Use fake in-memory/demo adapters in client tests and UI seed data.
- Add Supabase tables under `supabase/migrations` with RLS open to authenticated users, matching existing SourceKit migration style.
- Add a `bd-sourcing` Edge Function that exposes the intended API surface, includes server-side Parallel Fast Entity Search, Exa Company Search, and Exa Agent, and blocks Microsoft/Salesforce writes unless a later policy-approved integration is added.
- Use manual email handoff and CRM CSV export as the v1 completion path.
- Keep the UI operational and data-dense, aligned with existing SourceKit shell styling.
- Use TypeScript domain modules for scoring, state transitions, suppression/dedup, templates, and demo data.

## Non-Goals

- No real Microsoft Graph send.
- No real Outlook draft creation in tests.
- No real Salesforce write.
- No Microsoft or Salesforce OAuth requirement for v1.
- No LinkedIn automation.
- No generated email outside the canonical template.
- No rewrite to Next.js.

## Files To Add Or Modify

- Add `src/types/bd-sourcing.ts`: domain types, lifecycle states, provider result types, UI view models.
- Add `src/lib/bd-sourcing/config.ts`: editable deterministic defaults with `// TODO: confirm with operator` comments.
- Add `src/lib/bd-sourcing/scoring.ts`: deterministic score calculation.
- Add `src/lib/bd-sourcing/state-machine.ts`: allowed lifecycle transitions and transition helper.
- Add `src/lib/bd-sourcing/dedup.ts`: Salesforce exclusion, suppression, re-contact, and per-company cap checks.
- Add `src/lib/bd-sourcing/templates.ts`: canonical first-touch email and LinkedIn note generation with abstain checks.
- Add `src/lib/bd-sourcing/manual-handoff.ts`: copyable email, `.eml`, and CRM CSV export helpers.
- Add `src/lib/bd-sourcing/demo-data.ts`: local demo workflow data for UI and E2E-style tests.
- Add `src/services/bdSourcing.ts`: client wrapper for the future `bd-sourcing` Edge Function.
- Add `src/components/bd-sourcing/BdSourcingTab.tsx`: standalone app screen.
- Add `src/components/bd-sourcing/*.tsx`: focused UI sections for queue, target detail, signal evidence, email draft, LinkedIn note, and manual handoff status as needed.
- Modify `src/App.tsx`: lazy-load and render `/bd-sourcing` outside the SourceKit dashboard shell.
- Add `src/lib/bd-sourcing/__tests__/*.test.ts`: unit and workflow tests.
- Add `supabase/migrations/20260608000000_create_bd_sourcing_tables.sql`: schema.
- Add `supabase/functions/bd-sourcing/index.ts`: safe Edge Function action router with server-side Parallel Fast Entity Search, Exa Company Search, and Exa Agent.
- Modify `.env.example`: add manual-first mode, Apollo, Clay, Findem, Exa, Parallel, and optional future Microsoft/Salesforce env vars.
- Modify `README.md`: add BD sourcing setup and manual steps.

## Data Model With Full Schema

The schema is defined in `PRD.md` and implemented in `supabase/migrations/20260608000000_create_bd_sourcing_tables.sql`.

Additional indexes:

```sql
create index idx_bd_companies_domain on bd_companies(domain);
create index idx_bd_contacts_email on bd_contacts(lower(work_email));
create index idx_bd_contacts_company on bd_contacts(company_id);
create index idx_bd_signals_company on bd_signals(company_id, detected_at desc);
create index idx_bd_targets_state on bd_targets(lifecycle_state, updated_at desc);
create index idx_bd_targets_company on bd_targets(company_id);
create index idx_bd_outreach_target on bd_outreach_touches(target_id, created_at desc);
create index idx_bd_email_target on bd_email_messages(target_id, created_at desc);
create index idx_bd_suppressions_lookup on bd_suppressions(scope, lower(value));
create index idx_bd_scores_bucket on bd_scores(bucket, composite desc);
create index idx_bd_audit_target on bd_audit_logs(target_id, created_at desc);
```

## Deterministic Rules Sections

### Scoring

- `company_fit`: 100 if employee count and industry/funding filters pass, 60 if only one passes, 25 otherwise.
- `person_fit`: 100 if title and function both pass, 60 if one passes, 20 if title denylist matches.
- `signal_strength`: exec change 90, funding 85, senior hiring spike 80, open web 60, manual 50.
- `signal_freshness`: 100 for 0 to 7 days, 80 for 8 to 30 days, 50 for 31 to 90 days, 20 beyond 90 days.
- `reachability`: 100 for verified email, 50 for risky email, 0 for missing, invalid, or insufficient data.
- `composite`: unweighted mean of the five components.
- Bucket: `reach_now` at 75+, `warm_later` at 50 to 74, `not_a_fit` below 50.

### CRM/Salesforce-Compatible Exclusion

- Exclude active Leads and Contacts by configured status.
- Exclude Contacts or Accounts attached to configured active Opportunity stages.
- Exclude records owned by another rep when ownership enforcement is enabled.
- Return a concrete exclusion reason for every blocked record.

### Local Dedup And Suppression

- Normalize email to lowercase for email suppression.
- Normalize company domain to lowercase for company cap and domain suppression.
- Local outreach to the same email inside the re-contact window blocks queueing.
- One contact per company per 14 days by default.
- Reply and unsubscribe suppressions are permanent.

### State Machine

Allowed target transitions:

```txt
discovered -> scored
scored -> qualified
qualified -> sfdc_checked
sfdc_checked -> queued
queued -> approved
approved -> emailed
emailed -> opened
emailed -> replied
emailed -> li_drafted
opened -> replied
opened -> li_drafted
li_drafted -> li_sent
li_sent -> connected
connected -> meeting
meeting -> won
meeting -> lost
any non-terminal state -> suppressed
```

Terminal states: `won`, `lost`, `suppressed`.

## API Surface

Client wrapper:

```ts
invokeBdSourcingAction(action, payload)
discoverTargets(payload)
runDedup(targetId)
runEnrichment(targetId)
scoreTarget(targetId)
approveTarget(targetId)
draftEmail(targetId)
buildManualEmailHandoff(targetId)
exportManualCrmCsv(targetIds)
draftLinkedInNote(targetId)
createOutlookDraft(targetId) // optional future integration
sendApprovedEmail(targetId) // optional future integration
syncSalesforce(targetId) // optional future integration
```

Edge Function request:

```ts
type BdSourcingRequest = {
  action:
    | "discover"
    | "parallel_entity_search"
    | "exa_company_search"
    | "exa_agent_run"
    | "exa_agent_get_run"
    | "dedup"
    | "enrich"
    | "score"
    | "draft_email"
    | "approve"
    | "manual_email_handoff"
    | "manual_crm_export"
    | "create_outlook_draft"
    | "send_email"
    | "sync_salesforce"
    | "draft_linkedin_note";
  targetId?: string;
  payload?: Record<string, unknown>;
};
```

Edge Function response:

```ts
type BdSourcingResponse = {
  ok: boolean;
  action: string;
  status: "completed" | "blocked" | "stubbed";
  message: string;
  data?: Record<string, unknown>;
};
```

## Background Jobs

This implementation includes action-router stubs and deterministic local logic. Production jobs to add later:

- `bd_exa_monitor_ingest`: consume Exa Websets webhook items.
- `bd_parallel_fast_search`: synchronous people/company seed discovery via `/v1beta/findall/entity-search`.
- `bd_exa_company_search`: synchronous company seed discovery via `/search` with `category: "company"`.
- `bd_exa_agent_runs`: async multi-hop list building and enrichment via `/agent/runs`.
- `bd_findem_signal_import`: ingest Findem signals.
- `bd_enrichment_waterfall`: Apollo first, Clay fallback.
- `bd_crm_csv_dedup`: uploaded CRM report gate and ownership checks.
- Optional future `bd_graph_reply_unsubscribe_ingest`: Microsoft Graph webhook handler.
- Optional future `bd_salesforce_sync_retry`: retry failed approved syncs.

## Security

- Browser code never receives Apollo, Clay, Salesforce, Microsoft client secret, Exa, Parallel, or service-role keys.
- Manual email handoff and CRM export require an approved target state.
- The Edge Function returns `blocked` for Microsoft/Salesforce write attempts in v1.
- Demo/test adapters never call network APIs.
- Email draft helper always appends physical address and unsubscribe URL.
- LinkedIn output is note text plus profile URL only.
- CRM output is CSV for manual import, not an API write.

## Testing

### Test 1: Scorer

Write failing test first:

```ts
it("uses an unweighted mean and assigns reach_now at 75 or above", () => {
  const result = scoreTarget({
    company: { employeeCount: 800, fundingStage: "Series C", industry: "Software" },
    contact: { title: "VP Data", emailVerificationStatus: "verified" },
    signal: { signalType: "exec_change", sourceDate: "2026-06-01" },
    now: new Date("2026-06-08T00:00:00Z")
  });

  expect(result.composite).toBe(98);
  expect(result.bucket).toBe("reach_now");
});
```

### Test 2: CRM Exclusions

Write failing test first:

```ts
it("excludes active uploaded CRM records owned by another rep", () => {
  const result = evaluateSalesforceExclusion({
    leadStatus: "Working",
    contactStatus: null,
    opportunityStage: null,
    ownerEmail: "other@example.com",
    operatorEmail: "operator@example.com"
  });

  expect(result.excluded).toBe(true);
  expect(result.reason).toContain("active Lead");
  expect(result.reason).toContain("owned by another rep");
});
```

### Test 3: Suppression And Re-contact

Write failing test first:

```ts
it("blocks permanent unsubscribe suppression and recent outreach", () => {
  const result = evaluateLocalSuppression({
    email: "ALEX@EXAMPLE.COM",
    companyDomain: "example.com",
    now: new Date("2026-06-08T00:00:00Z"),
    suppressions: [{ scope: "email", value: "alex@example.com", reason: "unsubscribe", permanent: true }],
    priorTouches: [{ email: "alex@example.com", companyDomain: "example.com", sentAt: "2026-05-15T00:00:00Z" }]
  });

  expect(result.blocked).toBe(true);
  expect(result.reasons).toContain("permanent email suppression");
});
```

### Test 4: State Machine

Write failing test first:

```ts
it("requires queued before approval and blocks terminal transitions", () => {
  expect(canTransition("queued", "approved")).toBe(true);
  expect(canTransition("discovered", "approved")).toBe(false);
  expect(canTransition("suppressed", "queued")).toBe(false);
});
```

### Test 5: Draft Abstain

Write failing test first:

```ts
it("does not draft email without verified email and signal evidence", () => {
  const result = buildFirstTouchEmail({
    firstName: "Alex",
    company: "ExampleCo",
    workEmail: null,
    emailVerificationStatus: "unknown",
    signalReference: "",
    ctaBookingLink: "https://bookings.example.com/operator",
    operatorName: "Operator",
    physicalAddress: "123 Market St, San Francisco, CA",
    unsubscribeUrl: "https://example.com/unsubscribe"
  });

  expect(result.ok).toBe(false);
  expect(result.reason).toBe("insufficient_data");
});
```

### Test 6: End-To-End Safe Flow

Write failing test first:

```ts
it("runs discover to approve to draft without real send or CRM write", () => {
  const flow = runDemoBdSourcingFlow();

  expect(flow.target.lifecycleState).toBe("approved");
  expect(flow.emailDraft.status).toBe("draft");
  expect(flow.externalWrites).toEqual([]);
  expect(flow.auditLog.map((entry) => entry.action)).toEqual([
    "discovered",
    "sfdc_checked",
    "enriched",
    "scored",
    "queued",
    "approved",
    "email_drafted"
  ]);
});
```

## Env Vars

Add the variables listed in `PRD.md` to `.env.example`.

## Assumptions

- `TDD.md` means technical design document for this repo task. Unit tests still follow the test-first workflow.
- UI can ship with seeded demo data and safe action stubs while provider credentials are unavailable.
- External sourcing/enrichment providers are allowed: Exa, Parallel, Apollo, and Clay.
- Uploading company/customer/prospect data into the app is allowed.
- Microsoft Graph and Salesforce policy status is unknown, so v1 stays manual-first.
- The existing SourceKit shell, not a new standalone route stack, is the correct product container for this build.
