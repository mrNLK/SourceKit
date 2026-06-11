alter table public.sellkit_onboarding_profiles
  add column if not exists context_text text,
  add column if not exists context_source text not null default 'manual',
  add column if not exists context_updated_at timestamptz,
  add constraint sellkit_onboarding_context_source_check
    check (context_source in ('manual', 'guide_paste', 'api_import')),
  add constraint sellkit_onboarding_context_text_length_check
    check (context_text is null or char_length(context_text) <= 2000);

create table if not exists public.onboarding_context_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  text text not null default '',
  source text not null default 'manual' check (source in ('manual', 'guide_paste', 'api_import')),
  created_at timestamptz not null default now(),
  check (char_length(text) <= 2000)
);

create index if not exists idx_onboarding_context_history_user_created
  on public.onboarding_context_history (user_id, created_at desc);

create or replace function public.sellkit_onboarding_prepare_context()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.context_text, '') <> '' and new.context_updated_at is null then
      new.context_updated_at = now();
    end if;
  elsif old.context_text is distinct from new.context_text then
    new.context_updated_at = now();
  else
    new.context_updated_at = old.context_updated_at;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sellkit_onboarding_prepare_context on public.sellkit_onboarding_profiles;
create trigger trg_sellkit_onboarding_prepare_context
  before insert or update on public.sellkit_onboarding_profiles
  for each row execute function public.sellkit_onboarding_prepare_context();

create or replace function public.sellkit_onboarding_append_context_history()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT' and coalesce(new.context_text, '') <> '')
    or (tg_op = 'UPDATE' and old.context_text is distinct from new.context_text) then
    insert into public.onboarding_context_history (user_id, text, source, created_at)
    values (new.user_id, coalesce(new.context_text, ''), new.context_source, coalesce(new.context_updated_at, now()));
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sellkit_onboarding_context_history on public.sellkit_onboarding_profiles;
create trigger trg_sellkit_onboarding_context_history
  after insert or update on public.sellkit_onboarding_profiles
  for each row execute function public.sellkit_onboarding_append_context_history();

alter table public.onboarding_context_history enable row level security;

grant select, insert on table public.onboarding_context_history to authenticated;

drop policy if exists onboarding_context_history_select_own on public.onboarding_context_history;
create policy onboarding_context_history_select_own
  on public.onboarding_context_history
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists onboarding_context_history_insert_own on public.onboarding_context_history;
create policy onboarding_context_history_insert_own
  on public.onboarding_context_history
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

alter table public.bd_scores
  add column if not exists context_version text,
  add column if not exists context_stale boolean not null default false;

create index if not exists idx_bd_scores_context_stale
  on public.bd_scores (context_stale, created_at desc);

comment on table public.onboarding_context_history is
  'Append-only audit log for SellKit onboarding context text changes. Do not update or delete rows.';

comment on column public.bd_scores.context_version is
  'Operator context hash/history version used when the score was produced.';

comment on column public.bd_scores.context_stale is
  'True when onboarding context changed after the score was produced; re-score remains manual.';

-- Rollback note: drop idx_bd_scores_context_stale, bd_scores context columns,
-- onboarding_context_history triggers/functions/table, and context columns if a
-- future migration must reverse this. Existing onboarding data remains valid
-- because all new profile columns are nullable/default-safe from the app view.
