-- Pilot: invite-only access + per-user daily usage caps.
-- Enforcement in edge functions is gated by the PILOT_MODE=true function secret,
-- so applying this migration alone does not change behaviour for existing users.

create extension if not exists citext with schema extensions;

-- 1. Allowlist ---------------------------------------------------------------
create table if not exists public.pilot_allowlist (
  email extensions.citext primary key,
  note text,
  daily_search_cap integer,   -- null = use edge-function default
  daily_enrich_cap integer,
  daily_ai_cap integer,
  added_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table public.pilot_allowlist enable row level security;
-- No policies: only service_role / SQL editor can read or write.

-- 2. Daily usage counters ----------------------------------------------------
create table if not exists public.pilot_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null default (now() at time zone 'utc')::date,
  kind text not null check (kind in ('search', 'enrich', 'ai')),
  count integer not null default 0,
  primary key (user_id, usage_day, kind)
);
alter table public.pilot_daily_usage enable row level security;
drop policy if exists "pilot_daily_usage_select_own" on public.pilot_daily_usage;
create policy "pilot_daily_usage_select_own" on public.pilot_daily_usage
  for select to authenticated using (auth.uid() = user_id);

-- 3. Grant pro/unlimited to an auth user -------------------------------------
create or replace function public.pilot_grant_access(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_subscriptions (user_id, plan, search_limit)
  values (p_user_id, 'pro', null)
  on conflict (user_id) do update set plan = 'pro', search_limit = null, updated_at = now();

  insert into public.app_memberships (user_id, app_slug, role, status)
  values (p_user_id, 'sourcekit', 'member', 'active')
  on conflict (user_id, app_slug) do update set status = 'active', updated_at = now();
end $$;

-- 4. Admin helpers: select public.add_pilot_user('ceo@company.com', 'Acme');
create or replace function public.add_pilot_user(p_email text, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  insert into public.pilot_allowlist (email, note)
  values (lower(trim(p_email)), p_note)
  on conflict (email) do update set revoked_at = null, note = coalesce(excluded.note, pilot_allowlist.note);

  select id into v_user from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user is not null then
    perform public.pilot_grant_access(v_user);
    return 'allowlisted; existing user upgraded to pro';
  end if;
  return 'allowlisted; will be upgraded on first sign-in';
end $$;

create or replace function public.remove_pilot_user(p_email text)
returns void language sql security definer set search_path = public as $$
  update public.pilot_allowlist set revoked_at = now() where email = lower(trim(p_email));
$$;

-- 5. Trigger: allowlisted sign-ups get pro automatically ---------------------
create or replace function public.pilot_on_auth_user_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.pilot_allowlist
             where email = lower(new.email) and revoked_at is null) then
    perform public.pilot_grant_access(new.id);
  end if;
  return new;
end $$;

drop trigger if exists pilot_on_auth_user_created on auth.users;
create trigger pilot_on_auth_user_created
  after insert on auth.users
  for each row execute function public.pilot_on_auth_user_created();

-- 6. Check allowlist and (optionally) consume one unit of a daily cap --------
-- Returns jsonb: {allowed, error?, used?, limit?}. Atomic per (user, day, kind).
create or replace function public.pilot_consume(p_user_id uuid, p_kind text default null, p_default_cap integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row public.pilot_allowlist%rowtype;
  v_cap integer;
  v_count integer;
begin
  select a.* into v_row
  from public.pilot_allowlist a join auth.users u on lower(u.email) = a.email
  where u.id = p_user_id and a.revoked_at is null;

  if not found then
    return jsonb_build_object('allowed', false, 'error', 'not_invited');
  end if;
  if p_kind is null then
    return jsonb_build_object('allowed', true);
  end if;

  v_cap := case p_kind
    when 'search' then coalesce(v_row.daily_search_cap, p_default_cap)
    when 'enrich' then coalesce(v_row.daily_enrich_cap, p_default_cap)
    when 'ai'     then coalesce(v_row.daily_ai_cap, p_default_cap)
  end;

  insert into public.pilot_daily_usage (user_id, kind, count)
  values (p_user_id, p_kind, 1)
  on conflict (user_id, usage_day, kind) do update
    set count = pilot_daily_usage.count + 1
    where v_cap is null or pilot_daily_usage.count < v_cap
  returning count into v_count;

  if v_count is null then
    select count into v_count from public.pilot_daily_usage
    where user_id = p_user_id and usage_day = (now() at time zone 'utc')::date and kind = p_kind;
    return jsonb_build_object('allowed', false, 'error', 'daily_cap_reached', 'used', v_count, 'limit', v_cap);
  end if;
  return jsonb_build_object('allowed', true, 'used', v_count, 'limit', v_cap);
end $$;

-- Lock helpers down to service_role (edge functions) and SQL editor.
revoke all on function public.pilot_grant_access(uuid) from public, anon, authenticated;
revoke all on function public.add_pilot_user(text, text) from public, anon, authenticated;
revoke all on function public.remove_pilot_user(text) from public, anon, authenticated;
revoke all on function public.pilot_consume(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.pilot_consume(uuid, text, integer) to service_role;
