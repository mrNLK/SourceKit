-- Pilot: allow anyone with an exact @aifundpc.com email address, in addition
-- to individually allowlisted emails (add_pilot_user keeps working for
-- non-domain invites). Daily caps and all other pilot behaviour unchanged.
-- Exact, case-insensitive domain match only: subdomains
-- (x@sub.aifundpc.com), lookalikes (x@evil-aifundpc.com,
-- x@aifundpc.com.evil.com) and other domains (incl. @aifundpc.ai) do NOT pass.

-- 1. Single source of truth for pilot eligibility by email --------------------
create or replace function public.pilot_email_allowed(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_email is not null and (
    lower(trim(p_email)) ~ '^[^@[:space:]]+@aifundpc[.]com$'
    or exists (
      select 1 from public.pilot_allowlist a
      where lower(a.email::text) = lower(trim(p_email)) and a.revoked_at is null
    )
  );
$$;

-- Eligibility probes would reveal allowlist membership, so do not expose to clients.
revoke all on function public.pilot_email_allowed(text) from public, anon, authenticated;
grant execute on function public.pilot_email_allowed(text) to service_role;

-- 2. Sign-up trigger: domain users (like allowlisted ones) get pro ------------
create or replace function public.pilot_on_auth_user_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.pilot_email_allowed(new.email) then
    perform public.pilot_grant_access(new.id);
  end if;
  return new;
end $$;

-- 3. Access + daily-cap check: domain users allowed with the default caps ----
-- (per-user cap overrides still come from their pilot_allowlist row, if any).
create or replace function public.pilot_consume(p_user_id uuid, p_kind text default null, p_default_cap integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_row public.pilot_allowlist%rowtype;
  v_cap integer;
  v_count integer;
begin
  select email into v_email from auth.users where id = p_user_id;

  if v_email is null or not public.pilot_email_allowed(v_email) then
    return jsonb_build_object('allowed', false, 'error', 'not_invited');
  end if;
  if p_kind is null then
    return jsonb_build_object('allowed', true);
  end if;

  select a.* into v_row
  from public.pilot_allowlist a
  where lower(a.email::text) = lower(v_email) and a.revoked_at is null;

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

revoke all on function public.pilot_consume(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.pilot_consume(uuid, text, integer) to service_role;
