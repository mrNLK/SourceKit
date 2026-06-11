-- Harden the ten core bd_* tables created in 20260608000000.
--
-- Problem: every table carried a single permissive policy
--   for all to authenticated using (true) with check (true)
-- and no ownership column, so any authenticated user could read and write
-- every other user's BD data. No client or edge-function code reads or
-- writes these tables yet (the edge function is a pure provider proxy with
-- no database client), so this swap is safe while the tables are empty.
--
-- This migration:
--   1. adds user_id uuid not null default auth.uid() (FK to auth.users),
--      refusing to proceed if pre-existing rows would be left ownerless
--   2. replaces the permissive policy with least-privilege own-row policies
--   3. tightens table grants (anon revoked; bd_audit_logs append-only)
--   4. rescopes the two global unique indexes (company identity,
--      suppression value) to per-user so cross-tenant uniqueness violations
--      cannot leak row existence
--   5. hardens bd_update_timestamp() with an empty search_path
--
-- service_role is unaffected throughout: it bypasses RLS, and server-side
-- writers must set user_id explicitly (auth.uid() is null in that context,
-- so an unattributed service-role insert fails not-null — intentional).
--
-- Reversible: see the documented revert block at the end of this file.
-- Idempotent: add column if not exists, drop policy if exists before
-- create, create index if not exists.

-- 1. Ownership column on every core table.
do $$
declare
  tbl text;
  has_orphans boolean;
begin
  foreach tbl in array array[
    'bd_companies', 'bd_contacts', 'bd_signals', 'bd_targets',
    'bd_outreach_touches', 'bd_email_messages', 'bd_salesforce_links',
    'bd_suppressions', 'bd_scores', 'bd_audit_logs'
  ] loop
    execute format(
      'alter table public.%I add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid()',
      tbl
    );
    execute format('select exists (select 1 from public.%I where user_id is null)', tbl)
      into has_orphans;
    if has_orphans then
      raise exception
        'public.% has rows with null user_id; backfill ownership before applying this migration',
        tbl;
    end if;
    execute format('alter table public.%I alter column user_id set not null', tbl);
    execute format('create index if not exists idx_%s_user on public.%I (user_id)', tbl, tbl);
    execute format(
      'comment on column public.%I.user_id is ''Owning operator; rows are tenant-scoped by RLS. Service-role writers must set this explicitly.''',
      tbl
    );
  end loop;
end $$;

-- 2. Least-privilege own-row policies replacing <table>_auth_all.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'bd_companies', 'bd_contacts', 'bd_signals', 'bd_targets',
    'bd_outreach_touches', 'bd_email_messages', 'bd_salesforce_links',
    'bd_suppressions', 'bd_scores', 'bd_audit_logs'
  ] loop
    execute format('drop policy if exists %I on public.%I', tbl || '_auth_all', tbl);

    execute format('drop policy if exists %I on public.%I', tbl || '_select_own', tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      tbl || '_select_own', tbl
    );

    execute format('drop policy if exists %I on public.%I', tbl || '_insert_own', tbl);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      tbl || '_insert_own', tbl
    );

    -- bd_audit_logs stays append-only: no update or delete policy.
    if tbl <> 'bd_audit_logs' then
      execute format('drop policy if exists %I on public.%I', tbl || '_update_own', tbl);
      execute format(
        'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
        tbl || '_update_own', tbl
      );

      execute format('drop policy if exists %I on public.%I', tbl || '_delete_own', tbl);
      execute format(
        'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
        tbl || '_delete_own', tbl
      );
    end if;
  end loop;
end $$;

-- 3. Explicit grants: anon gets nothing; authenticated gets row-level CRUD
--    (RLS scopes it to own rows); audit logs are append-only.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'bd_companies', 'bd_contacts', 'bd_signals', 'bd_targets',
    'bd_outreach_touches', 'bd_email_messages', 'bd_salesforce_links',
    'bd_suppressions', 'bd_scores'
  ] loop
    execute format('revoke all on table public.%I from anon', tbl);
    execute format('revoke all on table public.%I from authenticated', tbl);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', tbl);
  end loop;
end $$;

revoke all on table public.bd_audit_logs from anon;
revoke all on table public.bd_audit_logs from authenticated;
grant select, insert on table public.bd_audit_logs to authenticated;

-- 4. Per-user uniqueness so one tenant's data cannot block (or be probed
--    through) another tenant's inserts.
drop index if exists idx_bd_companies_unique_identity;
create unique index if not exists idx_bd_companies_unique_identity
  on public.bd_companies (user_id, lower(name), coalesce(domain, ''));

drop index if exists idx_bd_suppressions_unique_value;
create unique index if not exists idx_bd_suppressions_unique_value
  on public.bd_suppressions (user_id, scope, lower(value));

-- 5. Function hardening missed by 20260611031656.
revoke all on function public.bd_update_timestamp() from public;
revoke all on function public.bd_update_timestamp() from anon;
revoke all on function public.bd_update_timestamp() from authenticated;
alter function public.bd_update_timestamp() set search_path = '';

-- ---------------------------------------------------------------------------
-- Revert (manual, run only if rolling back before any tenant data exists):
--   For each table T in the ten bd_* tables above:
--     drop policy if exists T_select_own on public.T;
--     drop policy if exists T_insert_own on public.T;
--     drop policy if exists T_update_own on public.T;  -- not on bd_audit_logs
--     drop policy if exists T_delete_own on public.T;  -- not on bd_audit_logs
--     create policy T_auth_all on public.T
--       for all to authenticated using (true) with check (true);
--     drop index if exists idx_T_user;
--     alter table public.T drop column if exists user_id;
--   drop index if exists idx_bd_companies_unique_identity;
--   create unique index idx_bd_companies_unique_identity
--     on public.bd_companies (lower(name), coalesce(domain, ''));
--   drop index if exists idx_bd_suppressions_unique_value;
--   create unique index idx_bd_suppressions_unique_value
--     on public.bd_suppressions (scope, lower(value));
-- ---------------------------------------------------------------------------

-- Post-apply verification (run as service role):
--   select tablename, policyname, cmd, qual, with_check
--     from pg_policies
--    where tablename like 'bd\_%' escape '\'
--    order by tablename, policyname;
--   -- expect: no *_auth_all rows; no qual/with_check equal to 'true';
--   --         4 policies per table (2 for bd_audit_logs)
--   select table_name, column_name, is_nullable
--     from information_schema.columns
--    where table_schema = 'public' and table_name like 'bd\_%' escape '\'
--      and column_name = 'user_id';
--   -- expect: 10 rows (plus bd_signal_radar_items), all is_nullable = 'NO'
