-- AI Fund Lockdown v3: allowlist-only (no user_id dependency)
-- All remote tables lack user_id. Use is_aifund_member() only.
-- Fully self-contained. Idempotent. Safe to re-run.

-- 1. Allowlist table
create table if not exists public.aifund_allowed_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'member',
  added_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.aifund_allowed_users enable row level security;

drop policy if exists "aifund_allowed_users_select_own" on public.aifund_allowed_users;
create policy "aifund_allowed_users_select_own" on public.aifund_allowed_users
  for select to authenticated using (lower(email) = lower(auth.email()));

insert into public.aifund_allowed_users (email, role)
values
  ('mike@aifund.ai', 'admin'),
  ('michael.f.rubino@gmail.com', 'admin')
on conflict (email) do nothing;

-- 2. Membership check function
create or replace function public.is_aifund_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.aifund_allowed_users
    where lower(email) = lower(auth.email())
  );
$$;

-- 3. RLS policies on all aifund tables

-- aifund_concepts
alter table public.aifund_concepts enable row level security;
drop policy if exists "aifund_concepts_select" on public.aifund_concepts;
create policy "aifund_concepts_select" on public.aifund_concepts
  for select to authenticated using (public.is_aifund_member());
drop policy if exists "aifund_concepts_insert" on public.aifund_concepts;
create policy "aifund_concepts_insert" on public.aifund_concepts
  for insert to authenticated with check (public.is_aifund_member());
drop policy if exists "aifund_concepts_update" on public.aifund_concepts;
create policy "aifund_concepts_update" on public.aifund_concepts
  for update to authenticated using (public.is_aifund_member()) with check (public.is_aifund_member());
drop policy if exists "aifund_concepts_delete" on public.aifund_concepts;
create policy "aifund_concepts_delete" on public.aifund_concepts
  for delete to authenticated using (public.is_aifund_member());

-- aifund_people
alter table public.aifund_people enable row level security;
drop policy if exists "aifund_people_select" on public.aifund_people;
create policy "aifund_people_select" on public.aifund_people
  for select to authenticated using (public.is_aifund_member());
drop policy if exists "aifund_people_insert" on public.aifund_people;
create policy "aifund_people_insert" on public.aifund_people
  for insert to authenticated with check (public.is_aifund_member());
drop policy if exists "aifund_people_update" on public.aifund_people;
create policy "aifund_people_update" on public.aifund_people
  for update to authenticated using (public.is_aifund_member()) with check (public.is_aifund_member());
drop policy if exists "aifund_people_delete" on public.aifund_people;
create policy "aifund_people_delete" on public.aifund_people
  for delete to authenticated using (public.is_aifund_member());

-- aifund_assignments
alter table public.aifund_assignments enable row level security;
drop policy if exists "aifund_assignments_select" on public.aifund_assignments;
create policy "aifund_assignments_select" on public.aifund_assignments
  for select to authenticated using (public.is_aifund_member());
drop policy if exists "aifund_assignments_insert" on public.aifund_assignments;
create policy "aifund_assignments_insert" on public.aifund_assignments
  for insert to authenticated with check (public.is_aifund_member());
drop policy if exists "aifund_assignments_update" on public.aifund_assignments;
create policy "aifund_assignments_update" on public.aifund_assignments
  for update to authenticated using (public.is_aifund_member()) with check (public.is_aifund_member());
drop policy if exists "aifund_assignments_delete" on public.aifund_assignments;
create policy "aifund_assignments_delete" on public.aifund_assignments
  for delete to authenticated using (public.is_aifund_member());

-- aifund_engagements
alter table public.aifund_engagements enable row level security;
drop policy if exists "aifund_engagements_select" on public.aifund_engagements;
create policy "aifund_engagements_select" on public.aifund_engagements
  for select to authenticated using (public.is_aifund_member());
drop policy if exists "aifund_engagements_insert" on public.aifund_engagements;
create policy "aifund_engagements_insert" on public.aifund_engagements
  for insert to authenticated with check (public.is_aifund_member());
drop policy if exists "aifund_engagements_update" on public.aifund_engagements;
create policy "aifund_engagements_update" on public.aifund_engagements
  for update to authenticated using (public.is_aifund_member()) with check (public.is_aifund_member());
drop policy if exists "aifund_engagements_delete" on public.aifund_engagements;
create policy "aifund_engagements_delete" on public.aifund_engagements
  for delete to authenticated using (public.is_aifund_member());

-- aifund_residencies
alter table public.aifund_residencies enable row level security;
drop policy if exists "aifund_residencies_select" on public.aifund_residencies;
create policy "aifund_residencies_select" on public.aifund_residencies
  for select to authenticated using (public.is_aifund_member());
drop policy if exists "aifund_residencies_insert" on public.aifund_residencies;
create policy "aifund_residencies_insert" on public.aifund_residencies
  for insert to authenticated with check (public.is_aifund_member());
drop policy if exists "aifund_residencies_update" on public.aifund_residencies;
create policy "aifund_residencies_update" on public.aifund_residencies
  for update to authenticated using (public.is_aifund_member()) with check (public.is_aifund_member());
drop policy if exists "aifund_residencies_delete" on public.aifund_residencies;
create policy "aifund_residencies_delete" on public.aifund_residencies
  for delete to authenticated using (public.is_aifund_member());

-- aifund_decision_memos
alter table public.aifund_decision_memos enable row level security;
drop policy if exists "aifund_decision_memos_select" on public.aifund_decision_memos;
create policy "aifund_decision_memos_select" on public.aifund_decision_memos
  for select to authenticated using (public.is_aifund_member());
drop policy if exists "aifund_decision_memos_insert" on public.aifund_decision_memos;
create policy "aifund_decision_memos_insert" on public.aifund_decision_memos
  for insert to authenticated with check (public.is_aifund_member());
drop policy if exists "aifund_decision_memos_update" on public.aifund_decision_memos;
create policy "aifund_decision_memos_update" on public.aifund_decision_memos
  for update to authenticated using (public.is_aifund_member()) with check (public.is_aifund_member());
drop policy if exists "aifund_decision_memos_delete" on public.aifund_decision_memos;
create policy "aifund_decision_memos_delete" on public.aifund_decision_memos
  for delete to authenticated using (public.is_aifund_member());

-- aifund_evidence
alter table public.aifund_evidence enable row level security;
drop policy if exists "aifund_evidence_select" on public.aifund_evidence;
create policy "aifund_evidence_select" on public.aifund_evidence
  for select to authenticated using (public.is_aifund_member());
drop policy if exists "aifund_evidence_insert" on public.aifund_evidence;
create policy "aifund_evidence_insert" on public.aifund_evidence
  for insert to authenticated with check (public.is_aifund_member());
drop policy if exists "aifund_evidence_update" on public.aifund_evidence;
create policy "aifund_evidence_update" on public.aifund_evidence
  for update to authenticated using (public.is_aifund_member()) with check (public.is_aifund_member());
drop policy if exists "aifund_evidence_delete" on public.aifund_evidence;
create policy "aifund_evidence_delete" on public.aifund_evidence
  for delete to authenticated using (public.is_aifund_member());

-- aifund_evaluation_scores
alter table public.aifund_evaluation_scores enable row level security;
drop policy if exists "aifund_evaluation_scores_select" on public.aifund_evaluation_scores;
create policy "aifund_evaluation_scores_select" on public.aifund_evaluation_scores
  for select to authenticated using (public.is_aifund_member());
drop policy if exists "aifund_evaluation_scores_insert" on public.aifund_evaluation_scores;
create policy "aifund_evaluation_scores_insert" on public.aifund_evaluation_scores
  for insert to authenticated with check (public.is_aifund_member());
drop policy if exists "aifund_evaluation_scores_update" on public.aifund_evaluation_scores;
create policy "aifund_evaluation_scores_update" on public.aifund_evaluation_scores
  for update to authenticated using (public.is_aifund_member()) with check (public.is_aifund_member());
drop policy if exists "aifund_evaluation_scores_delete" on public.aifund_evaluation_scores;
create policy "aifund_evaluation_scores_delete" on public.aifund_evaluation_scores
  for delete to authenticated using (public.is_aifund_member());

-- aifund_activity_events
alter table public.aifund_activity_events enable row level security;
drop policy if exists "aifund_activity_events_select" on public.aifund_activity_events;
create policy "aifund_activity_events_select" on public.aifund_activity_events
  for select to authenticated using (public.is_aifund_member());
drop policy if exists "aifund_activity_events_insert" on public.aifund_activity_events;
create policy "aifund_activity_events_insert" on public.aifund_activity_events
  for insert to authenticated with check (public.is_aifund_member());

-- aifund_intelligence_runs
alter table public.aifund_intelligence_runs enable row level security;
drop policy if exists "aifund_intelligence_runs_select" on public.aifund_intelligence_runs;
create policy "aifund_intelligence_runs_select" on public.aifund_intelligence_runs
  for select to authenticated using (public.is_aifund_member());
drop policy if exists "aifund_intelligence_runs_insert" on public.aifund_intelligence_runs;
create policy "aifund_intelligence_runs_insert" on public.aifund_intelligence_runs
  for insert to authenticated with check (public.is_aifund_member());
drop policy if exists "aifund_intelligence_runs_update" on public.aifund_intelligence_runs;
create policy "aifund_intelligence_runs_update" on public.aifund_intelligence_runs
  for update to authenticated using (public.is_aifund_member()) with check (public.is_aifund_member());

-- aifund_external_profiles
alter table public.aifund_external_profiles enable row level security;
drop policy if exists "aifund_external_profiles_select" on public.aifund_external_profiles;
create policy "aifund_external_profiles_select" on public.aifund_external_profiles
  for select to authenticated using (public.is_aifund_member());
drop policy if exists "aifund_external_profiles_insert" on public.aifund_external_profiles;
create policy "aifund_external_profiles_insert" on public.aifund_external_profiles
  for insert to authenticated with check (public.is_aifund_member());

-- Harmonic tables: conditional (may not exist in remote)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='aifund_harmonic_companies') THEN
    EXECUTE 'alter table public.aifund_harmonic_companies enable row level security';
    EXECUTE 'drop policy if exists "aifund_harmonic_companies_select_own" on public.aifund_harmonic_companies';
    EXECUTE 'drop policy if exists "aifund_harmonic_companies_select" on public.aifund_harmonic_companies';
    EXECUTE $p$create policy "aifund_harmonic_companies_select" on public.aifund_harmonic_companies for select to authenticated using (public.is_aifund_member())$p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='aifund_harmonic_saved_searches') THEN
    EXECUTE 'alter table public.aifund_harmonic_saved_searches enable row level security';
    EXECUTE 'drop policy if exists "aifund_harmonic_saved_searches_select_own" on public.aifund_harmonic_saved_searches';
    EXECUTE 'drop policy if exists "aifund_harmonic_saved_searches_select" on public.aifund_harmonic_saved_searches';
    EXECUTE $p$create policy "aifund_harmonic_saved_searches_select" on public.aifund_harmonic_saved_searches for select to authenticated using (public.is_aifund_member())$p$;
    EXECUTE 'drop policy if exists "aifund_harmonic_saved_searches_insert_own" on public.aifund_harmonic_saved_searches';
    EXECUTE 'drop policy if exists "aifund_harmonic_saved_searches_insert" on public.aifund_harmonic_saved_searches';
    EXECUTE $p$create policy "aifund_harmonic_saved_searches_insert" on public.aifund_harmonic_saved_searches for insert to authenticated with check (public.is_aifund_member())$p$;
    EXECUTE 'drop policy if exists "aifund_harmonic_saved_searches_update_own" on public.aifund_harmonic_saved_searches';
    EXECUTE 'drop policy if exists "aifund_harmonic_saved_searches_update" on public.aifund_harmonic_saved_searches';
    EXECUTE $p$create policy "aifund_harmonic_saved_searches_update" on public.aifund_harmonic_saved_searches for update to authenticated using (public.is_aifund_member()) with check (public.is_aifund_member())$p$;
    EXECUTE 'drop policy if exists "aifund_harmonic_saved_searches_delete_own" on public.aifund_harmonic_saved_searches';
    EXECUTE 'drop policy if exists "aifund_harmonic_saved_searches_delete" on public.aifund_harmonic_saved_searches';
    EXECUTE $p$create policy "aifund_harmonic_saved_searches_delete" on public.aifund_harmonic_saved_searches for delete to authenticated using (public.is_aifund_member())$p$;
  END IF;
END $$;
