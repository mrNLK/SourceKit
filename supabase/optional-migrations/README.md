# Optional migrations (not applied by `supabase db push`)

`recruiter_os_schema.sql` was previously `supabase/migrations/20260323_recruiter_os_schema.sql`.
Its 8-digit version did not match the CLI's 14-digit format, and it was **never applied**
to production (no `recruiter_*` tables exist; no row in `supabase_migrations.schema_migrations`).

It only backs the `/recruiter/*` module, which is hidden when `VITE_PILOT_MODE=true`.
Moving it here keeps `db push` from trying to apply an out-of-order migration.

To enable the recruiter module later, copy it into `supabase/migrations/` with a **new**
timestamp later than the latest applied migration, e.g.
`cp supabase/optional-migrations/recruiter_os_schema.sql supabase/migrations/$(date -u +%Y%m%d%H%M%S)_recruiter_os_schema.sql`.
