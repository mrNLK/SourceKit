create table if not exists public.sellkit_onboarding_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  ideal_company text not null default '',
  buyer_titles text not null default '',
  offer_line text not null default '',
  buying_signals text not null default '',
  email_voice text not null default '',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.sellkit_onboarding_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sellkit_onboarding_updated_at on public.sellkit_onboarding_profiles;
create trigger trg_sellkit_onboarding_updated_at
  before update on public.sellkit_onboarding_profiles
  for each row execute function public.sellkit_onboarding_touch_updated_at();

alter table public.sellkit_onboarding_profiles enable row level security;

grant select, insert, update, delete on table public.sellkit_onboarding_profiles to authenticated;

drop policy if exists sellkit_onboarding_select_own on public.sellkit_onboarding_profiles;
create policy sellkit_onboarding_select_own
  on public.sellkit_onboarding_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists sellkit_onboarding_insert_own on public.sellkit_onboarding_profiles;
create policy sellkit_onboarding_insert_own
  on public.sellkit_onboarding_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists sellkit_onboarding_update_own on public.sellkit_onboarding_profiles;
create policy sellkit_onboarding_update_own
  on public.sellkit_onboarding_profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists sellkit_onboarding_delete_own on public.sellkit_onboarding_profiles;
create policy sellkit_onboarding_delete_own
  on public.sellkit_onboarding_profiles
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
