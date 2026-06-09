create table if not exists public.app_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_slug text not null check (app_slug in ('sourcekit', 'founderfinder')),
  role text not null default 'member' check (role in ('member', 'admin')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, app_slug)
);

alter table public.app_memberships
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists app_memberships_app_slug_status_idx
  on public.app_memberships (app_slug, status);

alter table public.app_memberships enable row level security;

drop policy if exists "app_memberships_select_own" on public.app_memberships;
create policy "app_memberships_select_own"
  on public.app_memberships
  for select
  to authenticated
  using (auth.uid() = user_id);

do $$
begin
  if to_regclass('public.aifund_allowed_users') is not null then
    insert into public.app_memberships (user_id, app_slug, role, status)
    select
      users.id,
      'founderfinder',
      case
        when allowed.role = 'admin' then 'admin'
        else 'member'
      end,
      'active'
    from public.aifund_allowed_users allowed
    join auth.users users
      on lower(users.email) = lower(allowed.email)
    on conflict (user_id, app_slug) do update
      set role = excluded.role,
          status = excluded.status,
          updated_at = now();
  end if;
end $$;

create or replace function public.has_active_app_membership(target_app_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_memberships
    where user_id = auth.uid()
      and app_slug = target_app_slug
      and status = 'active'
  );
$$;

create or replace function public.is_founderfinder_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_active_app_membership('founderfinder');
$$;

create or replace function public.is_aifund_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_founderfinder_member();
$$;

do $$
begin
  if to_regclass('public.aifund_allowed_users') is not null then
    execute 'drop policy if exists "aifund_allowed_users_select_own" on public.aifund_allowed_users';
  end if;
end $$;

alter table public.aifund_concepts enable row level security;
drop policy if exists "aifund_concepts_select" on public.aifund_concepts;
drop policy if exists "aifund_concepts_insert" on public.aifund_concepts;
drop policy if exists "aifund_concepts_update" on public.aifund_concepts;
drop policy if exists "aifund_concepts_delete" on public.aifund_concepts;
create policy "aifund_concepts_select" on public.aifund_concepts
  for select to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_concepts_insert" on public.aifund_concepts
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_concepts_update" on public.aifund_concepts
  for update to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member())
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_concepts_delete" on public.aifund_concepts
  for delete to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());

alter table public.aifund_people enable row level security;
drop policy if exists "aifund_people_select" on public.aifund_people;
drop policy if exists "aifund_people_insert" on public.aifund_people;
drop policy if exists "aifund_people_update" on public.aifund_people;
drop policy if exists "aifund_people_delete" on public.aifund_people;
create policy "aifund_people_select" on public.aifund_people
  for select to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_people_insert" on public.aifund_people
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_people_update" on public.aifund_people
  for update to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member())
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_people_delete" on public.aifund_people
  for delete to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());

alter table public.aifund_assignments enable row level security;
drop policy if exists "aifund_assignments_select" on public.aifund_assignments;
drop policy if exists "aifund_assignments_insert" on public.aifund_assignments;
drop policy if exists "aifund_assignments_update" on public.aifund_assignments;
drop policy if exists "aifund_assignments_delete" on public.aifund_assignments;
create policy "aifund_assignments_select" on public.aifund_assignments
  for select to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_assignments_insert" on public.aifund_assignments
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_assignments_update" on public.aifund_assignments
  for update to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member())
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_assignments_delete" on public.aifund_assignments
  for delete to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());

alter table public.aifund_engagements enable row level security;
drop policy if exists "aifund_engagements_select" on public.aifund_engagements;
drop policy if exists "aifund_engagements_insert" on public.aifund_engagements;
drop policy if exists "aifund_engagements_update" on public.aifund_engagements;
drop policy if exists "aifund_engagements_delete" on public.aifund_engagements;
create policy "aifund_engagements_select" on public.aifund_engagements
  for select to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_engagements_insert" on public.aifund_engagements
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_engagements_update" on public.aifund_engagements
  for update to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member())
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_engagements_delete" on public.aifund_engagements
  for delete to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());

alter table public.aifund_residencies enable row level security;
drop policy if exists "aifund_residencies_select" on public.aifund_residencies;
drop policy if exists "aifund_residencies_insert" on public.aifund_residencies;
drop policy if exists "aifund_residencies_update" on public.aifund_residencies;
drop policy if exists "aifund_residencies_delete" on public.aifund_residencies;
create policy "aifund_residencies_select" on public.aifund_residencies
  for select to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_residencies_insert" on public.aifund_residencies
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_residencies_update" on public.aifund_residencies
  for update to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member())
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_residencies_delete" on public.aifund_residencies
  for delete to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());

alter table public.aifund_decision_memos enable row level security;
drop policy if exists "aifund_decision_memos_select" on public.aifund_decision_memos;
drop policy if exists "aifund_decision_memos_insert" on public.aifund_decision_memos;
drop policy if exists "aifund_decision_memos_update" on public.aifund_decision_memos;
drop policy if exists "aifund_decision_memos_delete" on public.aifund_decision_memos;
create policy "aifund_decision_memos_select" on public.aifund_decision_memos
  for select to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_decision_memos_insert" on public.aifund_decision_memos
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_decision_memos_update" on public.aifund_decision_memos
  for update to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member())
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_decision_memos_delete" on public.aifund_decision_memos
  for delete to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());

alter table public.aifund_evidence enable row level security;
drop policy if exists "aifund_evidence_select" on public.aifund_evidence;
drop policy if exists "aifund_evidence_insert" on public.aifund_evidence;
drop policy if exists "aifund_evidence_update" on public.aifund_evidence;
drop policy if exists "aifund_evidence_delete" on public.aifund_evidence;
create policy "aifund_evidence_select" on public.aifund_evidence
  for select to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_evidence_insert" on public.aifund_evidence
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_evidence_update" on public.aifund_evidence
  for update to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member())
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_evidence_delete" on public.aifund_evidence
  for delete to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());

alter table public.aifund_evaluation_scores enable row level security;
drop policy if exists "aifund_evaluation_scores_select" on public.aifund_evaluation_scores;
drop policy if exists "aifund_evaluation_scores_insert" on public.aifund_evaluation_scores;
drop policy if exists "aifund_evaluation_scores_update" on public.aifund_evaluation_scores;
drop policy if exists "aifund_evaluation_scores_delete" on public.aifund_evaluation_scores;
create policy "aifund_evaluation_scores_select" on public.aifund_evaluation_scores
  for select to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_evaluation_scores_insert" on public.aifund_evaluation_scores
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_evaluation_scores_update" on public.aifund_evaluation_scores
  for update to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member())
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_evaluation_scores_delete" on public.aifund_evaluation_scores
  for delete to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());

alter table public.aifund_activity_events enable row level security;
drop policy if exists "aifund_activity_events_select" on public.aifund_activity_events;
drop policy if exists "aifund_activity_events_insert" on public.aifund_activity_events;
create policy "aifund_activity_events_select" on public.aifund_activity_events
  for select to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_activity_events_insert" on public.aifund_activity_events
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_founderfinder_member());

alter table public.aifund_intelligence_runs enable row level security;
drop policy if exists "aifund_intelligence_runs_select" on public.aifund_intelligence_runs;
drop policy if exists "aifund_intelligence_runs_insert" on public.aifund_intelligence_runs;
drop policy if exists "aifund_intelligence_runs_update" on public.aifund_intelligence_runs;
create policy "aifund_intelligence_runs_select" on public.aifund_intelligence_runs
  for select to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_intelligence_runs_insert" on public.aifund_intelligence_runs
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_founderfinder_member());
create policy "aifund_intelligence_runs_update" on public.aifund_intelligence_runs
  for update to authenticated
  using (auth.uid() = user_id and public.is_founderfinder_member())
  with check (auth.uid() = user_id and public.is_founderfinder_member());

alter table public.aifund_external_profiles enable row level security;
drop policy if exists "aifund_external_profiles_select" on public.aifund_external_profiles;
drop policy if exists "aifund_external_profiles_insert" on public.aifund_external_profiles;
drop policy if exists "aifund_external_profiles_update" on public.aifund_external_profiles;
drop policy if exists "aifund_external_profiles_delete" on public.aifund_external_profiles;
create policy "aifund_external_profiles_select" on public.aifund_external_profiles
  for select to authenticated
  using (
    public.is_founderfinder_member()
    and exists (
      select 1
      from public.aifund_people
      where aifund_people.id = aifund_external_profiles.person_id
        and aifund_people.user_id = auth.uid()
    )
  );
create policy "aifund_external_profiles_insert" on public.aifund_external_profiles
  for insert to authenticated
  with check (
    public.is_founderfinder_member()
    and exists (
      select 1
      from public.aifund_people
      where aifund_people.id = aifund_external_profiles.person_id
        and aifund_people.user_id = auth.uid()
    )
  );
create policy "aifund_external_profiles_update" on public.aifund_external_profiles
  for update to authenticated
  using (
    public.is_founderfinder_member()
    and exists (
      select 1
      from public.aifund_people
      where aifund_people.id = aifund_external_profiles.person_id
        and aifund_people.user_id = auth.uid()
    )
  )
  with check (
    public.is_founderfinder_member()
    and exists (
      select 1
      from public.aifund_people
      where aifund_people.id = aifund_external_profiles.person_id
        and aifund_people.user_id = auth.uid()
    )
  );
create policy "aifund_external_profiles_delete" on public.aifund_external_profiles
  for delete to authenticated
  using (
    public.is_founderfinder_member()
    and exists (
      select 1
      from public.aifund_people
      where aifund_people.id = aifund_external_profiles.person_id
        and aifund_people.user_id = auth.uid()
    )
  );

do $$
begin
  if to_regclass('public.aifund_harmonic_companies') is not null then
    execute 'alter table public.aifund_harmonic_companies enable row level security';
    execute 'drop policy if exists "aifund_harmonic_companies_select_own" on public.aifund_harmonic_companies';
    execute 'drop policy if exists "aifund_harmonic_companies_select" on public.aifund_harmonic_companies';
    execute $policy$
      create policy "aifund_harmonic_companies_select" on public.aifund_harmonic_companies
        for select to authenticated
        using (auth.uid() = user_id and public.is_founderfinder_member())
    $policy$;
  end if;
end $$;

do $$
begin
  if to_regclass('public.aifund_harmonic_saved_searches') is not null then
    execute 'alter table public.aifund_harmonic_saved_searches enable row level security';
    execute 'drop policy if exists "aifund_harmonic_saved_searches_select_own" on public.aifund_harmonic_saved_searches';
    execute 'drop policy if exists "aifund_harmonic_saved_searches_insert_own" on public.aifund_harmonic_saved_searches';
    execute 'drop policy if exists "aifund_harmonic_saved_searches_update_own" on public.aifund_harmonic_saved_searches';
    execute 'drop policy if exists "aifund_harmonic_saved_searches_delete_own" on public.aifund_harmonic_saved_searches';
    execute 'drop policy if exists "aifund_harmonic_saved_searches_select" on public.aifund_harmonic_saved_searches';
    execute 'drop policy if exists "aifund_harmonic_saved_searches_insert" on public.aifund_harmonic_saved_searches';
    execute 'drop policy if exists "aifund_harmonic_saved_searches_update" on public.aifund_harmonic_saved_searches';
    execute 'drop policy if exists "aifund_harmonic_saved_searches_delete" on public.aifund_harmonic_saved_searches';
    execute $policy$
      create policy "aifund_harmonic_saved_searches_select" on public.aifund_harmonic_saved_searches
        for select to authenticated
        using (auth.uid() = user_id and public.is_founderfinder_member())
    $policy$;
    execute $policy$
      create policy "aifund_harmonic_saved_searches_insert" on public.aifund_harmonic_saved_searches
        for insert to authenticated
        with check (auth.uid() = user_id and public.is_founderfinder_member())
    $policy$;
    execute $policy$
      create policy "aifund_harmonic_saved_searches_update" on public.aifund_harmonic_saved_searches
        for update to authenticated
        using (auth.uid() = user_id and public.is_founderfinder_member())
        with check (auth.uid() = user_id and public.is_founderfinder_member())
    $policy$;
    execute $policy$
      create policy "aifund_harmonic_saved_searches_delete" on public.aifund_harmonic_saved_searches
        for delete to authenticated
        using (auth.uid() = user_id and public.is_founderfinder_member())
    $policy$;
  end if;
end $$;
