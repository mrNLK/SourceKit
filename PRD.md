# BD Sourcing App PRD

## Goal

Build a standalone single-user BD sourcing surface inside SourceKit for finding senior business leaders at tech companies, validating buying signals, verifying work email reachability, scoring targets, preparing draft-first outreach, surfacing manual Sales Navigator follow-up, and exporting approved work for manual email/CRM handoff.

The operator is the only end user. There is no client login, no LinkedIn automation, no automatic email send, and no external CRM write in v1.

## Technical Decisions

- Extend the existing SourceKit app instead of introducing a new backend topology.
- Use the current React 18, TypeScript, Vite, Tailwind, shadcn/Radix, Supabase, Supabase Edge Functions, Vitest, and Vercel SPA routing architecture.
- Do not migrate this repo to Next.js in this build. The repo currently has no `next` dependency, no `next.config.*`, and uses Vite scripts plus `vercel.json` SPA rewrites. A future Next migration should be a separate project.
- Reuse existing Supabase client access through `src/integrations/supabase/client.ts` and server-side key handling through Supabase Edge Functions.
- Reuse existing Exa Websets patterns from `src/services/websets.ts` and `supabase/functions/exa-websets`.
- Add Exa Company Search (`/search` with `category: "company"`) for structured company seed discovery.
- Add Exa Agent (`/agent/runs` with `Exa-Beta: agent-2026-05-07`) for async multi-hop list building, enrichment, structured output, and grounding when a workflow needs more than one search.
- Reuse existing Parallel server-side patterns from `supabase/functions/company-intel`, `map-company-talent`, and `parse-jd`.
- Add Parallel Fast Entity Search (`/v1beta/findall/entity-search`) as a low-latency people/company discovery provider. Use it to seed the queue quickly; use Exa Websets, async FindAll-style verification, Apollo, and Clay for evidence, enrichment, and send-readiness.
- Use manual-first handoff for v1 because Microsoft Graph and Salesforce policy status is unknown. Email drafts are copied/downloaded by the operator, and CRM sync is a CSV export/import flow.
- Keep provider adapter interfaces for Microsoft Graph and Salesforce as optional future integrations only. They are not required to finish v1.
- Model approval as a state transition in the target lifecycle, not a settings toggle.

## Non-Goals

- No candidate-facing or prospect-facing sends during build or tests.
- No automatic email sends in v1.
- No real Salesforce writes during build or tests.
- No Microsoft Graph or Salesforce dependency for v1.
- No LinkedIn or Sales Navigator login, scraping, automation, message sending, or browser control.
- No multi-tenant client workspace, client login, or role-based client permissions.
- No replacement of the current SourceKit recruiting workflow.
- No migration from Vite to Next.js in this task.
- No fabricated names, emails, LinkedIn URLs, buying signals, company data, or evidence URLs.
- No autonomous LLM generation that bypasses the approved template and edit/approval queue.

## Data Model With Full Schema

The production schema is implemented as Supabase migrations. The canonical logical tables are:

### `bd_companies`

```sql
create table bd_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  website_url text,
  linkedin_url text,
  employee_count integer,
  funding_stage text,
  industry text,
  tech_stack text[] not null default '{}',
  source_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lower(name), coalesce(domain, ''))
);
```

### `bd_contacts`

```sql
create table bd_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references bd_companies(id) on delete set null,
  first_name text not null,
  last_name text not null,
  full_name text not null,
  title text not null,
  department text,
  seniority text,
  work_email text,
  email_verification_status text not null default 'unknown'
    check (email_verification_status in ('unknown', 'verified', 'invalid', 'risky', 'insufficient_data')),
  linkedin_url text,
  sales_nav_url text,
  source_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lower(full_name), company_id)
);
```

### `bd_signals`

```sql
create table bd_signals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references bd_companies(id) on delete cascade,
  provider text not null check (provider in ('exa', 'findem', 'parallel', 'manual')),
  signal_type text not null check (signal_type in ('exec_change', 'senior_hiring_spike', 'funding', 'open_web', 'manual')),
  title text not null,
  summary text not null,
  source_url text not null,
  source_date date not null,
  detected_at timestamptz not null default now(),
  evidence_payload jsonb not null default '{}',
  unique (company_id, signal_type, source_url)
);
```

### `bd_targets`

```sql
create table bd_targets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references bd_companies(id) on delete cascade,
  contact_id uuid not null references bd_contacts(id) on delete cascade,
  signal_id uuid not null references bd_signals(id) on delete restrict,
  lifecycle_state text not null default 'discovered'
    check (lifecycle_state in (
      'discovered', 'scored', 'qualified', 'sfdc_checked', 'queued',
      'approved', 'emailed', 'opened', 'replied', 'li_drafted',
      'li_sent', 'connected', 'meeting', 'won', 'lost', 'suppressed'
    )),
  qualification_bucket text not null default 'warm_later'
    check (qualification_bucket in ('reach_now', 'warm_later', 'not_a_fit')),
  insufficiency_reason text,
  sfdc_exclusion_reason text,
  local_dedup_key text not null,
  current_owner text,
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, contact_id, signal_id)
);
```

### `bd_outreach_touches`

```sql
create table bd_outreach_touches (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references bd_targets(id) on delete cascade,
  channel text not null check (channel in ('email', 'linkedin_manual', 'salesforce_task')),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'sent', 'opened', 'replied', 'failed', 'suppressed')),
  subject text,
  body text,
  cta_url text,
  approved_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  provider_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

### `bd_email_messages`

```sql
create table bd_email_messages (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references bd_targets(id) on delete cascade,
  outreach_touch_id uuid references bd_outreach_touches(id) on delete set null,
  graph_draft_id text,
  graph_sent_id text,
  from_email text not null,
  to_email text not null,
  subject text not null,
  html_body text not null,
  text_body text not null,
  unsubscribe_url text not null,
  physical_address text not null,
  status text not null default 'draft'
    check (status in ('draft', 'created_in_outlook', 'sent', 'failed', 'suppressed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `bd_salesforce_links`

```sql
create table bd_salesforce_links (
  id uuid primary key default gen_random_uuid(),
  local_entity_type text not null check (local_entity_type in ('company', 'contact', 'target', 'outreach_touch')),
  local_entity_id uuid not null,
  salesforce_object_type text not null check (salesforce_object_type in ('Account', 'Lead', 'Contact', 'Opportunity', 'Task')),
  salesforce_id text not null,
  sync_state text not null default 'pending'
    check (sync_state in ('pending', 'synced', 'blocked', 'failed')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (local_entity_type, local_entity_id, salesforce_object_type)
);
```

### `bd_suppressions`

```sql
create table bd_suppressions (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('email', 'domain', 'company', 'contact')),
  value text not null,
  reason text not null check (reason in ('reply', 'unsubscribe', 'bounce', 'manual', 'salesforce_active', 'ownership_conflict')),
  permanent boolean not null default true,
  source text not null default 'system',
  created_at timestamptz not null default now(),
  unique (scope, lower(value))
);
```

### `bd_scores`

```sql
create table bd_scores (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references bd_targets(id) on delete cascade,
  company_fit numeric not null check (company_fit between 0 and 100),
  person_fit numeric not null check (person_fit between 0 and 100),
  signal_strength numeric not null check (signal_strength between 0 and 100),
  signal_freshness numeric not null check (signal_freshness between 0 and 100),
  reachability numeric not null check (reachability between 0 and 100),
  composite numeric not null check (composite between 0 and 100),
  bucket text not null check (bucket in ('reach_now', 'warm_later', 'not_a_fit')),
  reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (target_id)
);
```

### `bd_audit_logs`

```sql
create table bd_audit_logs (
  id uuid primary key default gen_random_uuid(),
  target_id uuid references bd_targets(id) on delete set null,
  actor text not null default 'system',
  action text not null,
  from_state text,
  to_state text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

## Deterministic Rules

All defaults are editable config values and must be surfaced with `// TODO: confirm with operator` in code.

### ICP Company Filters

```ts
{
  minEmployees: 200, // TODO: confirm with operator
  fundingStageAllowlist: ["Series B", "Series C", "Series D", "Growth", "Public"], // TODO: confirm with operator
  industryAllowlist: ["Software", "AI", "Data", "Cloud", "Cybersecurity", "Fintech"], // TODO: confirm with operator
  industryDenylist: ["Staffing", "Recruiting", "Agency"] // TODO: confirm with operator
}
```

### Person Filters

```ts
{
  titleAllowlist: ["VP", "Head", "Director", "Chief", "CIO", "CTO", "CDO", "CPO"], // TODO: confirm with operator
  functionAllowlist: ["Engineering", "Data", "Product", "Digital", "Strategy"], // TODO: confirm with operator
  titleDenylist: ["Assistant", "Coordinator", "Intern", "Recruiter", "Consultant"] // TODO: confirm with operator
}
```

### Scoring

```ts
{
  method: "unweighted_mean", // TODO: confirm with operator
  components: ["company_fit", "person_fit", "signal_strength", "signal_freshness", "reachability"],
  buckets: {
    reachNow: 75,
    warmLater: 50
  }
}
```

### Signal Detectors

```ts
{
  newRelevantExecDays: 90, // TODO: confirm with operator
  seniorRolesWindowDays: 30, // TODO: confirm with operator
  seniorRolesThreshold: 3, // TODO: confirm with operator
  fundingFreshnessDays: 90 // TODO: confirm with operator
}
```

### Send Caps And Suppression

```ts
{
  maxSendsPerDay: 30, // TODO: confirm with operator
  maxSignalAgeDays: 30, // TODO: confirm with operator
  recontactWindowDays: 90, // TODO: confirm with operator
  maxContactsPerCompanyPerDays: { contacts: 1, days: 14 }, // TODO: confirm with operator
  replySuppressesPermanently: true,
  unsubscribeSuppressesPermanently: true
}
```

### CRM/Salesforce-Compatible Exclusions

```ts
{
  excludeLeadStatuses: ["Open", "Working", "Nurture", "Qualified"], // TODO: confirm with operator
  excludeContactStatuses: ["Active", "Working", "Customer", "Do Not Contact"], // TODO: confirm with operator
  excludeOpportunityStages: ["Prospecting", "Qualification", "Proposal", "Negotiation", "Contracting"], // TODO: confirm with operator
  excludeOwnedByAnotherRep: true
}
```

### Email Template

```txt
Subject: Quick thought for {company}

Hi {first_name},

I noticed {signal_reference}. It made me think there may be a timely reason to compare notes on how your team is approaching this.

Would it be useful to grab 20 minutes? Here is my calendar: {cta_booking_link}

Best,
{operator_name}

{physical_address}
Unsubscribe: {unsubscribe_url}
```

Abstain rule: if there is no verified signal evidence and no verified work email, do not draft.

## API Surface

- `bd-sourcing` Supabase Edge Function with action routing:
  - `discover`: create local discovery candidates from demo input, Exa Company Search, Exa Agent, Exa Websets, Parallel Fast Entity Search, Findem, or open-web fallback.
  - `parallel_entity_search`: server-side Parallel Fast Entity Search for people or companies with `entity_type`, `objective`, and `match_limit`.
  - `exa_company_search`: server-side Exa Company Search for low-latency company seed lists with structured company metadata.
  - `exa_agent_run`: create an async Exa Agent run for multi-hop people/company discovery and enrichment.
  - `exa_agent_get_run`: poll an Exa Agent run for structured output, grounding, status, and cost metadata.
  - `dedup`: evaluate uploaded CRM data and local suppression gates.
  - `enrich`: Apollo-first, Clay-fallback enrichment interface.
  - `score`: deterministic scoring.
  - `draft_email`: template-bound email draft creation only.
  - `approve`: operator approval state transition.
  - `manual_email_handoff`: build copyable email text and `.eml` content for manual sending.
  - `manual_crm_export`: export approved targets as CRM-ready CSV.
  - `create_outlook_draft`: optional future Microsoft Graph draft creation. Blocked in v1.
  - `send_email`: optional future Microsoft Graph send. Blocked in v1.
  - `sync_salesforce`: optional future Salesforce write. Blocked in v1.
  - `draft_linkedin_note`: create manual Sales Navigator note and profile URL only.
- Client API wrapper: `src/services/bdSourcing.ts`.
- Deterministic rules and state machine: `src/lib/bd-sourcing/rules.ts`, `src/lib/bd-sourcing/state-machine.ts`, `src/lib/bd-sourcing/scoring.ts`.

## Background Jobs

- Parallel Fast Entity Search on-demand discovery for people and company seed lists.
- Exa Company Search on-demand company discovery using natural-language ICP constraints.
- Exa Agent async discovery/enrichment runs for multi-hop tasks such as finding companies and their decision makers with citations.
- Exa Websets monitor webhook ingestion into `bd_signals` and `bd_targets`.
- Findem signal import job for hiring, executive-change, and funding signals.
- Enrichment waterfall job: Apollo first, Clay fallback.
- Uploaded CRM CSV dedup gate before queueing.
- Daily send cap and per-company cap evaluator.
- Optional future reply, bounce, and unsubscribe ingestion from Microsoft Graph webhooks.
- Optional future Salesforce sync retry job for approved sends and activity tasks.

This build should implement local deterministic functions and non-writing stubs for external jobs.

## Security

- Keep API keys server-side in Supabase Edge Functions or Vercel/Supabase environment variables.
- Manual-first mode does not require Microsoft OAuth, Salesforce OAuth, refresh tokens, or CRM access tokens.
- If Microsoft/Salesforce are added later, keep all OAuth secrets server-side and require a fresh policy review.
- Enforce approval before manual email/CRM export.
- Append every approval, suppression, state change, and attempted external write to `bd_audit_logs`.
- Never log raw secrets, OAuth tokens, full email bodies with private data, or provider credentials.
- Every email must include a physical address and one-click unsubscribe URL.
- Unsubscribe or reply creates permanent suppression.

## Testing

- Unit tests:
  - Scoring unweighted mean and buckets.
  - CRM/Salesforce-compatible exclusion logic.
  - Local dedup and suppression keys.
  - State-machine allowed and blocked transitions.
  - Draft abstain when verified email or signal evidence is missing.
- Edge/API tests:
  - Auth required for external action wrapper.
  - Approval required before email handoff or CRM CSV export.
- End-to-end test:
  - Discover to uploaded CRM dedup to enrich to score to review queue to approve to draft.
  - Use fake adapters only.
  - Assert no real send and no real CRM write.
- Build checks:
  - `npm test`
  - `npm run build`

## Env Vars

```txt
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EXA_API_KEY=
PARALLEL_API_KEY=
FINDEM_API_KEY=
APOLLO_API_KEY=
CLAY_API_KEY=
MICROSOFT_TENANT_ID=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=
MICROSOFT_GRAPH_MAILBOX=
MICROSOFT_BOOKINGS_URL=
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_USERNAME=
SALESFORCE_LOGIN_URL=
SALESFORCE_API_VERSION=
BD_OPERATOR_NAME=
BD_OPERATOR_EMAIL=
BD_PHYSICAL_ADDRESS=
BD_UNSUBSCRIBE_BASE_URL=
BD_SENDING_DOMAIN=
APOLLO_SEQUENCE_ENABLED=false
INSTANTLY_SEQUENCE_ENABLED=false
```

## Assumptions

- External sourcing/enrichment tools are allowed: Exa, Parallel, Apollo, and Clay.
- Uploading company/customer/prospect data into the app is allowed.
- Microsoft Graph and Salesforce policy status is unknown, so v1 stays manual-first.
- Microsoft Entra app registration and Salesforce connected app details are optional future work, not v1 blockers.
- Apollo and Clay APIs will remain stubbed until credentials and exact field mappings are available.
- Findem integration is modeled as a signal import adapter until the actual API contract is available.
- This repo's current architecture is authoritative for this build, even though the prompt named Next.js.
- The first implementation ships a working local/demo flow with deterministic logic and clearly blocked external writes.
