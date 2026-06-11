create table if not exists public.aifund_lever_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null
    check (status in ('preview', 'completed', 'failed')),
  mode text not null
    check (mode in ('preview', 'sync')),
  source text not null
    check (source in ('lever_api', 'manual_rows')),
  max_applicants integer not null default 100,
  include_archived boolean not null default false,
  resurfacing_window_days integer not null default 180,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aifund_lever_sync_runs_user_id_idx
  on public.aifund_lever_sync_runs (user_id, created_at desc);

alter table public.aifund_lever_sync_runs enable row level security;
drop policy if exists "aifund_lever_sync_runs_select" on public.aifund_lever_sync_runs;
drop policy if exists "aifund_lever_sync_runs_insert" on public.aifund_lever_sync_runs;
drop policy if exists "aifund_lever_sync_runs_update" on public.aifund_lever_sync_runs;
drop policy if exists "aifund_lever_sync_runs_delete" on public.aifund_lever_sync_runs;
create policy "aifund_lever_sync_runs_select" on public.aifund_lever_sync_runs
  for select to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_lever_sync_runs_insert" on public.aifund_lever_sync_runs
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_lever_sync_runs_update" on public.aifund_lever_sync_runs
  for update to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member())
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_lever_sync_runs_delete" on public.aifund_lever_sync_runs
  for delete to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
