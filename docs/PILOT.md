# SourceKit pilot (free, invite-only)

## Enable
1. Apply migration `20261016020000_pilot_access_and_usage_caps.sql` (`supabase db push`).
2. Edge Function secrets: `PILOT_MODE=true` (+ optional `PILOT_DAILY_CAP_SEARCH|ENRICH|AI`, defaults 25/150/100 per UTC day; `0` or `none` = unlimited).
3. Vercel env: `VITE_PILOT_MODE=true`, redeploy.
4. Redeploy edge functions (`supabase functions deploy`) so `_shared/auth.ts`, `_shared/gate.ts`, `_shared/pilot.ts` are live.

## Invite / remove (SQL editor)
```sql
select public.add_pilot_user('ceo@company.com', 'Acme — Jane Doe');
select public.remove_pilot_user('ceo@company.com');
-- Per-user cap override:
update public.pilot_allowlist set daily_search_cap = 50 where email = 'ceo@company.com';
-- Usage today:
select u.email, d.kind, d.count from pilot_daily_usage d join auth.users u on u.id = d.user_id
where d.usage_day = (now() at time zone 'utc')::date order by 3 desc;
```
`add_pilot_user` upgrades an existing account to pro immediately; otherwise a trigger on
`auth.users` grants pro on first sign-in. Remember to add yourself (and any admins) too:
with `PILOT_MODE=true` everyone not on the allowlist gets `403 not_invited`.

## What counts against which cap
| Cap | Functions |
|---|---|
| search | github-search, research-role, search-candidates, harmonic-search |
| enrich | enrich-linkedin, harmonic-enrich, github-code-quality |
| ai | generate-outreach, bulk-actions, parse-jd |
Other authenticated functions only check the allowlist.
