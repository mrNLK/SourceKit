create table if not exists public.bd_signal_radar_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_name text not null,
  company_domain text not null default '',
  signal_type text not null
    check (signal_type in ('exec_change', 'senior_hiring_spike', 'funding', 'open_web', 'manual')),
  signal_title text not null,
  signal_summary text not null default '',
  source_url text not null default '',
  provider text not null default 'manual'
    check (provider in ('exa', 'findem', 'parallel', 'manual')),
  detected_at timestamptz not null default now(),
  confidence integer not null default 60
    check (confidence between 0 and 100),
  suggested_persona text not null default 'other'
    check (suggested_persona in ('cto', 'vp_eng', 'vp_data', 'head_transformation', 'security_ciso', 'other')),
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'queued', 'ignored')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bd_signal_radar_items_user_detected
  on public.bd_signal_radar_items (user_id, detected_at desc);

create index if not exists idx_bd_signal_radar_items_user_status
  on public.bd_signal_radar_items (user_id, status, detected_at desc);

create or replace function public.bd_signal_radar_items_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bd_signal_radar_items_updated_at on public.bd_signal_radar_items;
create trigger trg_bd_signal_radar_items_updated_at
  before update on public.bd_signal_radar_items
  for each row execute function public.bd_signal_radar_items_touch_updated_at();

alter table public.bd_signal_radar_items enable row level security;

grant select, insert, update on table public.bd_signal_radar_items to authenticated;

drop policy if exists bd_signal_radar_items_select_own on public.bd_signal_radar_items;
create policy bd_signal_radar_items_select_own
  on public.bd_signal_radar_items
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists bd_signal_radar_items_insert_own on public.bd_signal_radar_items;
create policy bd_signal_radar_items_insert_own
  on public.bd_signal_radar_items
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists bd_signal_radar_items_update_own on public.bd_signal_radar_items;
create policy bd_signal_radar_items_update_own
  on public.bd_signal_radar_items
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on table public.bd_signal_radar_items is
  'SellKit Signal Radar review items. Manual-first: rows describe detected account signals; no outreach or enrichment runs from this table.';

comment on column public.bd_signal_radar_items.status is
  'new -> reviewed -> queued/ignored review workflow driven by manual operator actions only.';
