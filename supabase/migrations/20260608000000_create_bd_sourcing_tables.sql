-- BD sourcing schema: companies, contacts, signals, targets, outreach, sync, suppression, scoring, and audit.

create table if not exists bd_companies (
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
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_bd_companies_unique_identity
  on bd_companies (lower(name), coalesce(domain, ''));

create table if not exists bd_contacts (
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
  unique (full_name, company_id)
);

create table if not exists bd_signals (
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

create table if not exists bd_targets (
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

create table if not exists bd_outreach_touches (
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

create table if not exists bd_email_messages (
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

create table if not exists bd_salesforce_links (
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

create table if not exists bd_suppressions (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('email', 'domain', 'company', 'contact')),
  value text not null,
  reason text not null check (reason in ('reply', 'unsubscribe', 'bounce', 'manual', 'salesforce_active', 'ownership_conflict')),
  permanent boolean not null default true,
  source text not null default 'system',
  created_at timestamptz not null default now()
);

create unique index if not exists idx_bd_suppressions_unique_value
  on bd_suppressions (scope, lower(value));

create table if not exists bd_scores (
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

create table if not exists bd_audit_logs (
  id uuid primary key default gen_random_uuid(),
  target_id uuid references bd_targets(id) on delete set null,
  actor text not null default 'system',
  action text not null,
  from_state text,
  to_state text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_bd_companies_domain on bd_companies(domain);
create index if not exists idx_bd_contacts_email on bd_contacts(lower(work_email));
create index if not exists idx_bd_contacts_company on bd_contacts(company_id);
create index if not exists idx_bd_signals_company on bd_signals(company_id, detected_at desc);
create index if not exists idx_bd_targets_state on bd_targets(lifecycle_state, updated_at desc);
create index if not exists idx_bd_targets_company on bd_targets(company_id);
create index if not exists idx_bd_outreach_target on bd_outreach_touches(target_id, created_at desc);
create index if not exists idx_bd_email_target on bd_email_messages(target_id, created_at desc);
create index if not exists idx_bd_suppressions_lookup on bd_suppressions(scope, lower(value));
create index if not exists idx_bd_scores_bucket on bd_scores(bucket, composite desc);
create index if not exists idx_bd_audit_target on bd_audit_logs(target_id, created_at desc);

create or replace function bd_update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_bd_companies_updated on bd_companies;
create trigger trg_bd_companies_updated
  before update on bd_companies
  for each row execute function bd_update_timestamp();

drop trigger if exists trg_bd_contacts_updated on bd_contacts;
create trigger trg_bd_contacts_updated
  before update on bd_contacts
  for each row execute function bd_update_timestamp();

drop trigger if exists trg_bd_targets_updated on bd_targets;
create trigger trg_bd_targets_updated
  before update on bd_targets
  for each row execute function bd_update_timestamp();

drop trigger if exists trg_bd_email_messages_updated on bd_email_messages;
create trigger trg_bd_email_messages_updated
  before update on bd_email_messages
  for each row execute function bd_update_timestamp();

alter table bd_companies enable row level security;
alter table bd_contacts enable row level security;
alter table bd_signals enable row level security;
alter table bd_targets enable row level security;
alter table bd_outreach_touches enable row level security;
alter table bd_email_messages enable row level security;
alter table bd_salesforce_links enable row level security;
alter table bd_suppressions enable row level security;
alter table bd_scores enable row level security;
alter table bd_audit_logs enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'bd_companies', 'bd_contacts', 'bd_signals', 'bd_targets',
    'bd_outreach_touches', 'bd_email_messages', 'bd_salesforce_links',
    'bd_suppressions', 'bd_scores', 'bd_audit_logs'
  ] loop
    execute format('
      drop policy if exists %I on %I;
      create policy %I on %I
        for all to authenticated using (true) with check (true);
    ', tbl || '_auth_all', tbl, tbl || '_auth_all', tbl);
  end loop;
end $$;
