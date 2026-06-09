create table if not exists public.aifund_build_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid references public.aifund_concepts(id) on delete set null,
  title text not null,
  problem_statement text,
  target_user text,
  repo_url text,
  deploy_url text,
  current_stage text not null default 'explore'
    check (current_stage in ('explore', 'prd_research', 'tdd_review', 'build_loop', 'manual_polish')),
  status text not null default 'active'
    check (status in ('active', 'shipped', 'parked')),
  template_version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aifund_build_projects_user_id_idx
  on public.aifund_build_projects (user_id, updated_at desc);

create index if not exists aifund_build_projects_concept_id_idx
  on public.aifund_build_projects (concept_id);

create table if not exists public.aifund_build_stage_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.aifund_build_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stage text not null
    check (stage in ('explore', 'prd_research', 'tdd_review', 'build_loop', 'manual_polish')),
  status text not null default 'locked'
    check (status in ('locked', 'active', 'completed')),
  checklist_state jsonb not null default '{}'::jsonb,
  summary text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, stage)
);

create index if not exists aifund_build_stage_runs_user_id_idx
  on public.aifund_build_stage_runs (user_id, created_at desc);

create index if not exists aifund_build_stage_runs_project_id_idx
  on public.aifund_build_stage_runs (project_id, created_at asc);

create table if not exists public.aifund_build_artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.aifund_build_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_type text not null
    check (artifact_type in (
      'experiment_log',
      'prd',
      'market_signals',
      'tdd',
      'engineering_questions',
      'implementation_notes',
      'qa_notes',
      'manual_test_notes',
      'polish_backlog'
    )),
  title text not null,
  markdown_body text not null default '',
  source_stage text not null
    check (source_stage in ('explore', 'prd_research', 'tdd_review', 'build_loop', 'manual_polish')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, artifact_type)
);

create index if not exists aifund_build_artifacts_user_id_idx
  on public.aifund_build_artifacts (user_id, updated_at desc);

create index if not exists aifund_build_artifacts_project_id_idx
  on public.aifund_build_artifacts (project_id, updated_at desc);

alter table public.aifund_build_projects enable row level security;
drop policy if exists "aifund_build_projects_select" on public.aifund_build_projects;
drop policy if exists "aifund_build_projects_insert" on public.aifund_build_projects;
drop policy if exists "aifund_build_projects_update" on public.aifund_build_projects;
drop policy if exists "aifund_build_projects_delete" on public.aifund_build_projects;
create policy "aifund_build_projects_select" on public.aifund_build_projects
  for select to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_build_projects_insert" on public.aifund_build_projects
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_build_projects_update" on public.aifund_build_projects
  for update to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member())
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_build_projects_delete" on public.aifund_build_projects
  for delete to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());

alter table public.aifund_build_stage_runs enable row level security;
drop policy if exists "aifund_build_stage_runs_select" on public.aifund_build_stage_runs;
drop policy if exists "aifund_build_stage_runs_insert" on public.aifund_build_stage_runs;
drop policy if exists "aifund_build_stage_runs_update" on public.aifund_build_stage_runs;
drop policy if exists "aifund_build_stage_runs_delete" on public.aifund_build_stage_runs;
create policy "aifund_build_stage_runs_select" on public.aifund_build_stage_runs
  for select to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_build_stage_runs_insert" on public.aifund_build_stage_runs
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_build_stage_runs_update" on public.aifund_build_stage_runs
  for update to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member())
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_build_stage_runs_delete" on public.aifund_build_stage_runs
  for delete to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());

alter table public.aifund_build_artifacts enable row level security;
drop policy if exists "aifund_build_artifacts_select" on public.aifund_build_artifacts;
drop policy if exists "aifund_build_artifacts_insert" on public.aifund_build_artifacts;
drop policy if exists "aifund_build_artifacts_update" on public.aifund_build_artifacts;
drop policy if exists "aifund_build_artifacts_delete" on public.aifund_build_artifacts;
create policy "aifund_build_artifacts_select" on public.aifund_build_artifacts
  for select to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_build_artifacts_insert" on public.aifund_build_artifacts
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_build_artifacts_update" on public.aifund_build_artifacts
  for update to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member())
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_build_artifacts_delete" on public.aifund_build_artifacts
  for delete to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
