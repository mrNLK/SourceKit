create table if not exists public.bd_conversion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  target_id uuid references public.bd_targets(id) on delete cascade,
  target_external_id text,
  signal_id uuid references public.bd_signals(id) on delete set null,
  signal_external_id text,
  outreach_touch_id uuid references public.bd_outreach_touches(id) on delete set null,
  company_name text not null,
  contact_name text not null,
  signal_type text not null
    check (signal_type in ('exec_change', 'senior_hiring_spike', 'funding', 'open_web', 'manual')),
  signal_title text not null,
  event_type text not null
    check (event_type in (
      'target_approved',
      'manual_email_sent',
      'linkedin_note_sent',
      'reply_received',
      'positive_reply',
      'meeting_booked',
      'opportunity_created',
      'won',
      'lost',
      'disqualified'
    )),
  conversion_area text not null
    check (conversion_area in ('signal', 'outreach', 'both')),
  channel text
    check (channel is null or channel in ('manual_email', 'linkedin_manual', 'crm_import', 'offline')),
  occurred_at timestamptz not null default now(),
  source text not null default 'manual'
    check (source in ('manual', 'csv_import', 'api_import', 'provider_webhook', 'demo')),
  notes text not null default '',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  check (target_id is not null or target_external_id is not null)
);

create index if not exists idx_bd_conversion_events_user_occurred
  on public.bd_conversion_events (user_id, occurred_at desc);

create index if not exists idx_bd_conversion_events_target
  on public.bd_conversion_events (target_id, target_external_id, occurred_at desc);

create index if not exists idx_bd_conversion_events_signal
  on public.bd_conversion_events (signal_type, signal_title, occurred_at desc);

create index if not exists idx_bd_conversion_events_outreach
  on public.bd_conversion_events (channel, event_type, occurred_at desc);

alter table public.bd_conversion_events enable row level security;

grant select, insert on table public.bd_conversion_events to authenticated;

drop policy if exists bd_conversion_events_select_own on public.bd_conversion_events;
create policy bd_conversion_events_select_own
  on public.bd_conversion_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists bd_conversion_events_insert_own on public.bd_conversion_events;
create policy bd_conversion_events_insert_own
  on public.bd_conversion_events
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

comment on table public.bd_conversion_events is
  'Append-only SellKit conversion events for signal attribution and manual outreach outcome tracking.';

comment on column public.bd_conversion_events.conversion_area is
  'signal tracks lead quality, outreach tracks manual send workflow, both counts for both analytics views.';

comment on column public.bd_conversion_events.metadata is
  'Provider payloads, import references, or manual provenance. Never store provider secrets here.';
